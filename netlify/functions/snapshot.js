const { takeSnapshot } = require('./lib/snapshot');
const {
  getWebsite,
  getAllWebsites,
  uploadScreenshot,
  getSupabaseClient
} = require('./lib/supabase');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

/**
 * Snapshot function - Take and manage website snapshots (Supabase-backed)
 *
 * POST/GET ?action=capture&websiteId=xxx  — take a new snapshot
 * GET      ?action=list&websiteId=xxx     — list snapshots for a website
 * GET      ?action=list                   — list all websites
 */
exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const params = event.queryStringParameters || {};
  const action = params.action || 'list';
  const websiteId = params.websiteId || params.id;

  try {
    switch (action) {
      case 'capture': {
        if (!websiteId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'websiteId is required' })
          };
        }

        let website;
        try {
          website = await getWebsite(websiteId);
        } catch (err) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: `Website '${websiteId}' not found` })
          };
        }

        console.log(`[SNAPSHOT] Capturing ${website.name} (${website.url})...`);

        const snapshot = await takeSnapshot(website.url, {
          captureScreenshot: true,
          captureHTML: false,
          fullPage: false
        });

        if (!snapshot.success) {
          console.error(`[SNAPSHOT] Failed for ${website.name}: ${snapshot.error}`);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Snapshot failed', detail: snapshot.error })
          };
        }

        // Save screenshot to Supabase Storage
        let screenshotUrl = null;
        if (snapshot.screenshot) {
          const filename = `snapshot-${Date.now()}.png`;
          const result = await uploadScreenshot(websiteId, snapshot.screenshot, filename);
          screenshotUrl = result.publicUrl;
          console.log(`[SNAPSHOT] Saved ${website.name} screenshot: ${filename}`);
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            websiteId,
            name: website.name,
            url: website.url,
            screenshotUrl,
            metadata: snapshot.metadata,
            timestamp: snapshot.timestamp
          })
        };
      }

      case 'list': {
        if (!websiteId) {
          // List all websites
          const websites = await getAllWebsites();
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              websites: websites.map(w => ({
                id: w.id,
                name: w.name,
                url: w.url,
                clientId: w.client_id
              }))
            })
          };
        }

        // List screenshots for a website from Supabase Storage
        const supabase = getSupabaseClient();
        const { data: files, error } = await supabase.storage
          .from('screenshots')
          .list(websiteId, { sortBy: { column: 'created_at', order: 'desc' }, limit: 50 });

        if (error) throw error;

        const snapshots = (files || [])
          .filter(f => f.name.startsWith('snapshot-') && f.name.endsWith('.png'))
          .map(f => {
            const { data: urlData } = supabase.storage
              .from('screenshots')
              .getPublicUrl(`${websiteId}/${f.name}`);
            return {
              name: f.name,
              url: urlData.publicUrl,
              createdAt: f.created_at,
              size: f.metadata?.size || 0
            };
          });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            websiteId,
            count: snapshots.length,
            snapshots
          })
        };
      }

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Unknown action',
            validActions: ['capture', 'list']
          })
        };
    }
  } catch (error) {
    console.error('[SNAPSHOT] Error:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

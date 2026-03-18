const { takeSnapshot, saveSnapshot, listSnapshots, getSnapshot } = require('./lib/snapshot');
const config = require('../../config.json');

/**
 * Snapshot function - Take and manage website snapshots
 * 
 * Actions:
 * - capture: Take a new snapshot of a website
 * - list: List all snapshots for a website
 * - view: View a specific snapshot
 */
exports.handler = async (event, context) => {
  const { httpMethod, queryStringParameters = {} } = event;
  
  // Only allow GET and POST
  if (httpMethod !== 'GET' && httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  const action = queryStringParameters.action || 'list';
  const websiteId = queryStringParameters.websiteId || queryStringParameters.id;
  const timestamp = queryStringParameters.timestamp;
  
  try {
    switch (action) {
      case 'capture': {
        if (!websiteId) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'websiteId is required' })
          };
        }
        
        // Find website in config
        const website = config.websites.find(w => 
          (w.id || w.name.toLowerCase().replace(/\s+/g, '-')) === websiteId
        );
        
        if (!website) {
          return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Website not found in config' })
          };
        }
        
        console.log(`Taking snapshot of ${website.name}...`);
        
        const snapshot = await takeSnapshot(website.url, {
          captureScreenshot: true,
          captureHTML: true,
          fullPage: true
        });
        
        if (!snapshot.success) {
          return {
            statusCode: 500,
            body: JSON.stringify({ 
              error: 'Snapshot failed',
              details: snapshot.error 
            })
          };
        }
        
        const saved = await saveSnapshot(websiteId, snapshot);
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            action: 'capture',
            websiteId,
            websiteName: website.name,
            timestamp: snapshot.timestamp,
            saved: saved.success,
            metadata: snapshot.metadata,
            htmlSize: snapshot.htmlSize
          }, null, 2)
        };
      }
      
      case 'list': {
        if (!websiteId) {
          // List all websites with snapshot capability
          const websites = config.websites.map(w => ({
            id: w.id || w.name.toLowerCase().replace(/\s+/g, '-'),
            name: w.name,
            url: w.url,
            clientId: w.clientId
          }));
          
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'list-websites',
              websites,
              hint: 'Add ?action=list&websiteId=YOUR_ID to see snapshots for a specific website'
            }, null, 2)
          };
        }
        
        const list = await listSnapshots(websiteId);
        
        if (!list.success) {
          return {
            statusCode: 500,
            body: JSON.stringify({ 
              error: 'Failed to list snapshots',
              details: list.error 
            })
          };
        }
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            action: 'list',
            websiteId,
            count: list.count,
            snapshots: list.snapshots.map(s => ({
              timestamp: s.timestamp,
              date: s.date,
              url: s.url,
              title: s.metadata?.title,
              hasScreenshot: s.hasScreenshot,
              hasHTML: s.hasHTML
            }))
          }, null, 2)
        };
      }
      
      case 'view': {
        if (!websiteId || !timestamp) {
          return {
            statusCode: 400,
            body: JSON.stringify({ 
              error: 'websiteId and timestamp are required',
              example: '?action=view&websiteId=my-site&timestamp=1234567890'
            })
          };
        }
        
        const result = await getSnapshot(websiteId, timestamp);
        
        if (!result.success) {
          return {
            statusCode: 404,
            body: JSON.stringify({ 
              error: 'Snapshot not found',
              details: result.error 
            })
          };
        }
        
        const format = queryStringParameters.format || 'json';
        
        if (format === 'html' && result.snapshot.html) {
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'text/html' },
            body: result.snapshot.html
          };
        }
        
        if (format === 'png' && result.snapshot.screenshot) {
          return {
            statusCode: 200,
            headers: { 
              'Content-Type': 'image/png',
              'Content-Disposition': `inline; filename="${websiteId}-${timestamp}.png"`
            },
            body: result.snapshot.screenshot.toString('base64'),
            isBase64Encoded: true
          };
        }
        
        // Default: JSON metadata
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            action: 'view',
            websiteId,
            timestamp,
            snapshot: {
              ...result.snapshot,
              screenshot: result.snapshot.screenshot ? '[binary data]' : null,
              html: result.snapshot.html ? `${result.snapshot.html.length} bytes` : null
            },
            viewOptions: {
              html: `?action=view&websiteId=${websiteId}&timestamp=${timestamp}&format=html`,
              png: `?action=view&websiteId=${websiteId}&timestamp=${timestamp}&format=png`
            }
          }, null, 2)
        };
      }
      
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ 
            error: 'Unknown action',
            validActions: ['capture', 'list', 'view'],
            examples: [
              '?action=capture&websiteId=my-site',
              '?action=list&websiteId=my-site',
              '?action=view&websiteId=my-site&timestamp=1234567890&format=html'
            ]
          })
        };
    }
  } catch (error) {
    console.error('Snapshot function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};

const {
  getAllWebsites,
  getWebsite,
  createWebsite,
  updateWebsite
} = require('./lib/supabase');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Content-Type': 'application/json'
};

/**
 * Websites CRUD API
 *
 * GET   /.netlify/functions/websites              — list all
 * GET   /.netlify/functions/websites?id=xxx       — get one
 * POST  /.netlify/functions/websites              — create (JSON body)
 * PUT   /.netlify/functions/websites?id=xxx       — update (JSON body)
 */
exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};
    const websiteId = params.id;

    if (event.httpMethod === 'GET') {
      if (websiteId) {
        const website = await getWebsite(websiteId);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, data: website })
        };
      }
      const websites = await getAllWebsites();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: websites })
      };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);

      if (!body.name || !body.url) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'name and url are required' })
        };
      }

      // Generate ID from name if not provided
      const id = body.id || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const website = await createWebsite({
        id,
        name: body.name,
        url: body.url,
        client_id: body.clientId || null,
        check_interval: body.checkInterval || 5,
        visual_check_enabled: body.visualCheck || false,
        snapshot_enabled: body.snapshot || false,
        custom_checks: body.customChecks || [],
        enabled: true
      });

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, data: website })
      };
    }

    if (event.httpMethod === 'PUT') {
      if (!websiteId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Website id required' })
        };
      }

      const body = JSON.parse(event.body);
      const updates = {};
      if (body.name !== undefined) updates.name = body.name;
      if (body.url !== undefined) updates.url = body.url;
      if (body.clientId !== undefined) updates.client_id = body.clientId;
      if (body.enabled !== undefined) updates.enabled = body.enabled;
      if (body.visualCheck !== undefined) updates.visual_check_enabled = body.visualCheck;
      if (body.snapshot !== undefined) updates.snapshot_enabled = body.snapshot;

      const website = await updateWebsite(websiteId, updates);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: website })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  } catch (error) {
    console.error('Websites API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

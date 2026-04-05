const {
  getAllClients,
  getClient,
  createClientRecord,
  updateClient
} = require('./lib/supabase');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Content-Type': 'application/json'
};

/**
 * Clients API
 *
 * GET    /.netlify/functions/clients              — list all clients
 * GET    /.netlify/functions/clients?id=client-id  — get one client
 * POST   /.netlify/functions/clients               — create client (JSON body)
 * PUT    /.netlify/functions/clients?id=client-id   — update client (JSON body)
 */
exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};
    const clientId = params.id;

    if (event.httpMethod === 'GET') {
      if (clientId) {
        const client = await getClient(clientId);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, data: client })
        };
      }

      const clients = await getAllClients();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: clients })
      };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      const client = await createClientRecord({
        id: body.id,
        name: body.name,
        email: body.email || null,
        notes: body.notes || null,
        color: body.color || '#6B7280'
      });
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, data: client })
      };
    }

    if (event.httpMethod === 'PUT') {
      if (!clientId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Client id required' })
        };
      }

      const body = JSON.parse(event.body);
      const updates = {};
      if (body.name !== undefined) updates.name = body.name;
      if (body.email !== undefined) updates.email = body.email;
      if (body.notes !== undefined) updates.notes = body.notes;
      if (body.color !== undefined) updates.color = body.color;

      const client = await updateClient(clientId, updates);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: client })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  } catch (error) {
    console.error('Clients API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

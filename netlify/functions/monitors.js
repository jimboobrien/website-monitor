const {
  deleteMonitorCheck,
  deleteIncident,
  deleteAllIncidents,
  deleteWebsite,
  deleteEnvironmentData,
  getEnvironment,
  getWebsite
} = require('./lib/supabase');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

/**
 * Monitors management API
 *
 * DELETE ?action=delete-incident&incidentId=123          — delete a single incident
 * DELETE ?action=delete-all-incidents&websiteId=abc      — delete all incidents for a website
 * DELETE ?action=delete-website&websiteId=abc            — delete a website and all its data
 */
exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // GET: return current environment info
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, environment: getEnvironment() })
    };
  }

  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const params = event.queryStringParameters || {};
    const action = params.action;

    if (action === 'delete-check') {
      const checkId = params.checkId;
      if (!checkId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'checkId required' })
        };
      }

      await deleteMonitorCheck(checkId);
      console.log(`[DELETE] Deleted check ${checkId}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: `Check ${checkId} deleted` })
      };
    }

    if (action === 'delete-incident') {
      const incidentId = params.incidentId;
      if (!incidentId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'incidentId required' })
        };
      }

      await deleteIncident(incidentId);
      console.log(`[DELETE] Deleted incident ${incidentId}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: `Incident ${incidentId} deleted` })
      };
    }

    if (action === 'delete-all-incidents') {
      const websiteId = params.websiteId;
      if (!websiteId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'websiteId required' })
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

      await deleteAllIncidents(websiteId);
      console.log(`[DELETE] Deleted all incidents for ${website.name} (${websiteId})`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: `All incidents cleared for ${website.name}` })
      };
    }

    if (action === 'delete-website') {
      const websiteId = params.websiteId;
      if (!websiteId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'websiteId required' })
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

      await deleteWebsite(websiteId);
      console.log(`[DELETE] Deleted website ${website.name} (${websiteId}) and all related data`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: `Deleted ${website.name} and all related data` })
      };
    }

    if (action === 'delete-environment') {
      const env = params.env;
      if (!env) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'env parameter required (e.g. ?env=local)' })
        };
      }

      if (env === 'production') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Cannot bulk-delete production data from this endpoint' })
        };
      }

      const result = await deleteEnvironmentData(env);
      console.log(`[DELETE] Cleared ${env} data: ${result.checksDeleted} checks, ${result.incidentsDeleted} incidents`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `Cleared ${env} data`,
          deleted: result
        })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Invalid action',
        validActions: ['delete-check', 'delete-incident', 'delete-all-incidents', 'delete-website', 'delete-environment']
      })
    };
  } catch (error) {
    console.error('[DELETE] Error:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

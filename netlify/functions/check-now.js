const fetch = require('node-fetch');
const {
  getAllWebsites,
  getWebsite,
  saveMonitorCheck,
  createIncident,
  resolveIncident,
  getActiveIncidents
} = require('./lib/supabase');

/**
 * Check a single website
 */
async function checkWebsite(url) {
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'WebsiteStatusMonitor/1.0'
      }
    });

    const responseTime = Date.now() - startTime;

    return {
      status: response.status,
      statusText: response.statusText,
      isUp: response.ok,
      responseTime,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 0,
      statusText: error.message,
      isUp: false,
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * Run a check for a single website, save result, and handle incidents
 */
async function runCheck(site, activeIncidentsByWebsite) {
  const result = await checkWebsite(site.url);

  // Save to Supabase
  await saveMonitorCheck({
    websiteId: site.id,
    timestamp: result.timestamp,
    status: result.isUp ? 'up' : 'down',
    responseTime: result.responseTime,
    statusCode: result.status,
    error: result.error || null,
    issues: []
  });

  // Handle incidents
  const siteActiveIncidents = activeIncidentsByWebsite[site.id] || [];

  if (!result.isUp && siteActiveIncidents.length === 0) {
    await createIncident({
      websiteId: site.id,
      startedAt: result.timestamp,
      type: 'down',
      severity: 'critical',
      message: `${site.name} is down: ${result.error || `HTTP ${result.status}`}`
    });
  } else if (result.isUp && siteActiveIncidents.length > 0) {
    await Promise.all(
      siteActiveIncidents.map(inc => resolveIncident(inc.id, result.timestamp))
    );
  }

  return {
    websiteId: site.id,
    name: site.name,
    url: site.url,
    ...result
  };
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

/**
 * Check Now API
 *
 * GET/POST /.netlify/functions/check-now?id=website-id  — check one site
 * GET/POST /.netlify/functions/check-now?all=true        — check all sites
 */
exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};
    const websiteId = params.id;
    const checkAll = params.all === 'true';

    if (!websiteId && !checkAll) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Provide ?id=website-id or ?all=true' })
      };
    }

    // Build active incidents lookup
    const activeIncidents = await getActiveIncidents();
    const activeIncidentsByWebsite = {};
    activeIncidents.forEach(inc => {
      if (!activeIncidentsByWebsite[inc.website_id]) {
        activeIncidentsByWebsite[inc.website_id] = [];
      }
      activeIncidentsByWebsite[inc.website_id].push(inc);
    });

    let results;

    if (checkAll) {
      const websites = await getAllWebsites();
      results = await Promise.all(
        websites.map(site => runCheck(site, activeIncidentsByWebsite))
      );
    } else {
      const site = await getWebsite(websiteId);
      if (!site) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: `Website '${websiteId}' not found` })
        };
      }
      const result = await runCheck(site, activeIncidentsByWebsite);
      results = [result];
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        checked: results.length,
        results,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Check-now error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

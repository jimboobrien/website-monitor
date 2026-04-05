/**
 * Dashboard Data API
 * Provides monitor statistics and status data for the dashboard UI
 * 
 * Endpoints:
 * GET /.netlify/functions/dashboard-data?action=overview
 * GET /.netlify/functions/dashboard-data?action=monitors
 * GET /.netlify/functions/dashboard-data?action=monitor&id=website-id
 * GET /.netlify/functions/dashboard-data?action=clients
 * GET /.netlify/functions/dashboard-data?action=response-time&id=website-id&hours=24
 * GET /.netlify/functions/dashboard-data?action=uptime-history&id=website-id&days=7
 */

const {
  getMonitorStats,
  getAllMonitorStats,
  getGlobalStats,
  getMonitorsByClient,
  getResponseTimeHistory,
  getUptimeHistory
} = require('./lib/dashboard-service-supabase');

const { getMonitorChecks, listScreenshots, getBaselineUrl } = require('./lib/supabase');

// No longer need config.json - all config comes from Supabase

// CORS headers for browser requests
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const params = event.queryStringParameters || {};
    const action = params.action || 'overview';
    const envFilter = params.env || undefined; // optional: ?env=production or ?env=local

    switch (action) {
      case 'overview': {
        // Get all monitor stats and global statistics
        const monitorStats = await getAllMonitorStats({ env: envFilter });
        const globalStats = getGlobalStats(monitorStats);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: {
              global: globalStats,
              timestamp: Date.now()
            }
          })
        };
      }

      case 'monitors': {
        // Get all monitors with their statistics
        const monitorStats = await getAllMonitorStats({ env: envFilter });
        
        // Optional: filter by client
        const clientId = params.client;
        const filteredStats = clientId
          ? monitorStats.filter(m => m.clientId === clientId)
          : monitorStats;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: filteredStats,
            timestamp: Date.now()
          })
        };
      }

      case 'monitor': {
        // Get specific monitor details
        const monitorId = params.id;
        if (!monitorId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Monitor id required' })
          };
        }
        
        const stats = await getMonitorStats(monitorId, { env: envFilter });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: stats,
            timestamp: Date.now()
          })
        };
      }

      case 'clients': {
        // Get monitors grouped by client
        const monitorStats = await getAllMonitorStats({ env: envFilter });
        const byClient = await getMonitorsByClient(monitorStats);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: byClient,
            timestamp: Date.now()
          })
        };
      }

      case 'response-time': {
        // Get response time history for a monitor
        const monitorId = params.id;
        const hours = parseInt(params.hours || '24', 10);
        
        if (!monitorId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Monitor id required' })
          };
        }
        
        const history = await getResponseTimeHistory(monitorId, hours, { env: envFilter });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: history,
            timestamp: Date.now()
          })
        };
      }

      case 'uptime-history': {
        // Get uptime history (daily buckets) for a monitor
        const monitorId = params.id;
        const days = parseInt(params.days || '7', 10);
        
        if (!monitorId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Monitor id required' })
          };
        }
        
        const history = await getUptimeHistory(monitorId, days, { env: envFilter });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: history,
            timestamp: Date.now()
          })
        };
      }

      case 'screenshots': {
        const monitorId = params.id;

        if (!monitorId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Monitor id required' })
          };
        }

        const [screenshots, baselineUrl] = await Promise.all([
          listScreenshots(monitorId).catch(() => []),
          getBaselineUrl(monitorId).catch(() => null)
        ]);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: { screenshots, baselineUrl },
            timestamp: Date.now()
          })
        };
      }

      case 'checks': {
        const monitorId = params.id;
        const hours = parseInt(params.hours || '24', 10);

        if (!monitorId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Monitor id required' })
          };
        }

        const checks = await getMonitorChecks(monitorId, hours, 1000, { env: envFilter });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: checks,
            timestamp: Date.now()
          })
        };
      }

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Invalid action',
            validActions: [
              'overview',
              'monitors',
              'monitor',
              'clients',
              'response-time',
              'uptime-history',
              'checks',
              'screenshots'
            ]
          })
        };
    }
  } catch (error) {
    console.error('Dashboard API error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

const { schedule } = require('@netlify/functions');
const fetch = require('node-fetch');
const sgMail = require('@sendgrid/mail');
const {
  getAllWebsites,
  getAllClients,
  saveMonitorCheck,
  createIncident,
  resolveIncident,
  getActiveIncidents,
  saveAlertHistory
} = require('./lib/supabase');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Check if a website is up and responding
 */
async function checkWebsite(url) {
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'WebsiteStatusMonitor/1.0'
      }
    });

    const responseTime = Date.now() - startTime;
    const isUp = response.ok; // Status 200-299

    return {
      url,
      status: response.status,
      statusText: response.statusText,
      isUp,
      responseTime,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      url,
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
 * Group results by client
 */
function groupByClient(results) {
  const grouped = {};

  results.forEach(result => {
    const clientId = result.clientId || 'uncategorized';
    if (!grouped[clientId]) {
      grouped[clientId] = {
        client: result.client || { name: 'Uncategorized', id: null },
        sites: []
      };
    }
    grouped[clientId].sites.push(result);
  });

  return grouped;
}

/**
 * Send email alert via SendGrid
 */
async function sendAlert(results) {
  const downSites = results.filter(r => !r.isUp);

  if (downSites.length === 0) {
    return null;
  }

  let emailBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #e74c3c;">⚠️ Website Status Alert</h2>
  <p style="font-size: 16px; color: #333;">
    <strong>${downSites.length}</strong> website${downSites.length > 1 ? 's are' : ' is'} currently down or unreachable.
  </p>
`;

  const grouped = groupByClient(downSites);

  Object.values(grouped).forEach(group => {
    const clientName = group.client.name || 'Uncategorized';
    const clientEmail = group.client.email ? ` (${group.client.email})` : '';

    emailBody += `
  <div style="margin: 20px 0;">
    <h3 style="color: #2c3e50; margin-bottom: 10px;">
      👤 ${clientName}${clientEmail}
    </h3>
`;

    group.sites.forEach(site => {
      emailBody += `
    <div style="border-left: 4px solid #e74c3c; padding: 12px; margin: 10px 0; background: #f8f9fa; border-radius: 4px;">
      <strong style="color: #e74c3c;">🔴 ${site.name}</strong><br/>
      <small style="color: #666;">URL: ${site.url}</small><br/>
      <small style="color: #666;">Status: ${site.status || 'Unreachable'} - ${site.statusText}</small><br/>
      <small style="color: #999;">Time: ${new Date(site.timestamp).toLocaleString()}</small><br/>
      ${site.error ? `<small style="color: #e74c3c;">Error: ${site.error}</small>` : ''}
    </div>
`;
    });

    emailBody += `
  </div>
`;
  });

  emailBody += `
  <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;"/>
  <p style="color: #999; font-size: 12px;">
    Checked at: ${new Date().toLocaleString()}<br/>
    Monitoring via Website Status Monitor
  </p>
</div>
`;

  const subject = `🚨 Website Down Alert - ${downSites.length} site(s) affected`;
  const msg = {
    to: process.env.ALERT_EMAIL,
    from: process.env.FROM_EMAIL,
    subject,
    html: emailBody,
  };

  try {
    await sgMail.send(msg);

    // Log alert history for each affected site
    await Promise.all(downSites.map(site =>
      saveAlertHistory({
        websiteId: site.websiteId,
        type: 'down',
        recipient: process.env.ALERT_EMAIL,
        subject,
        success: true
      }).catch(err => console.error(`Failed to log alert for ${site.websiteId}:`, err))
    ));

    return { sent: true, downSites: downSites.length };
  } catch (error) {
    console.error('SendGrid error:', error);
    return { sent: false, error: error.message };
  }
}

/**
 * Main monitoring function
 */
const monitorHandler = async (event, context) => {
  console.log('Starting website monitoring check...');

  // Check if required environment variables are set
  if (!process.env.SENDGRID_API_KEY || !process.env.ALERT_EMAIL) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Missing required environment variables: SENDGRID_API_KEY, ALERT_EMAIL'
      })
    };
  }

  try {
    // Load websites and clients from Supabase
    const [websites, clients] = await Promise.all([
      getAllWebsites(),
      getAllClients()
    ]);

    // Create a client lookup map
    const clientMap = {};
    clients.forEach(client => {
      clientMap[client.id] = client;
    });

    // Get active incidents to track recovery
    const activeIncidents = await getActiveIncidents();
    const activeIncidentsByWebsite = {};
    activeIncidents.forEach(inc => {
      if (!activeIncidentsByWebsite[inc.website_id]) {
        activeIncidentsByWebsite[inc.website_id] = [];
      }
      activeIncidentsByWebsite[inc.website_id].push(inc);
    });

    // Check all websites and attach client info
    const results = await Promise.all(
      websites.map(async (site) => {
        const result = await checkWebsite(site.url);

        // Attach additional metadata
        result.name = site.name || site.url;
        result.websiteId = site.id;
        result.clientId = site.client_id || null;
        result.client = site.client_id ? clientMap[site.client_id] : null;

        // Save check result to Supabase
        await saveMonitorCheck({
          websiteId: site.id,
          timestamp: result.timestamp,
          status: result.isUp ? 'up' : 'down',
          responseTime: result.responseTime,
          statusCode: result.status,
          error: result.error || null,
          issues: []
        });

        // Handle incident tracking
        const siteActiveIncidents = activeIncidentsByWebsite[site.id] || [];

        if (!result.isUp && siteActiveIncidents.length === 0) {
          // Site just went down — create incident
          await createIncident({
            websiteId: site.id,
            startedAt: result.timestamp,
            type: 'down',
            severity: 'critical',
            message: `${site.name} is down: ${result.error || `HTTP ${result.status}`}`
          });
        } else if (result.isUp && siteActiveIncidents.length > 0) {
          // Site recovered — resolve active incidents
          await Promise.all(
            siteActiveIncidents.map(inc =>
              resolveIncident(inc.id, result.timestamp)
            )
          );
        }

        return result;
      })
    );

    // Send alerts if any sites are down
    const alertResult = await sendAlert(results);

    // Group results by client
    const byClient = groupByClient(results);

    // Prepare response
    const response = {
      timestamp: new Date().toISOString(),
      totalChecked: results.length,
      sitesUp: results.filter(r => r.isUp).length,
      sitesDown: results.filter(r => !r.isUp).length,
      results: results,
      byClient: byClient,
      alertSent: alertResult
    };

    console.log('Monitoring check complete:', {
      totalChecked: response.totalChecked,
      sitesUp: response.sitesUp,
      sitesDown: response.sitesDown
    });

    return {
      statusCode: 200,
      body: JSON.stringify(response, null, 2)
    };
  } catch (error) {
    console.error('Monitoring error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

exports.handler = schedule("*/5 * * * *", monitorHandler);

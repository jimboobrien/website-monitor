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
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Check if a website is up and responding
 */
async function checkWebsite(site) {
  const startTime = Date.now();
  let url = site.url;
  const name = site.name || url;
  const isHttps = url.startsWith('https://');
  const httpFallbackUrl = url.replace(/^https:\/\//, 'http://');

  console.log(`[CHECK] ${name} — ${url}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      timeout: 10000,
      redirect: 'follow',
      headers: {
        'User-Agent': 'WebsiteStatusMonitor/1.0'
      }
    });

    const responseTime = Date.now() - startTime;
    const isUp = response.ok;
    const finalUrl = response.url || url;
    const sslActive = finalUrl.startsWith('https://');

    if (isUp) {
      console.log(`[  OK ] ${name} — ${response.status} in ${responseTime}ms [${sslActive ? 'HTTPS' : 'HTTP'}]`);
    } else {
      console.warn(`[WARN ] ${name} — HTTP ${response.status} ${response.statusText} in ${responseTime}ms`);
    }

    return {
      url: finalUrl,
      status: response.status,
      statusText: response.statusText,
      isUp,
      responseTime,
      ssl: sslActive,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    // If HTTPS failed, try HTTP as fallback
    if (isHttps) {
      console.warn(`[RETRY] ${name} — HTTPS failed (${error.message}), trying HTTP...`);
      try {
        const retryStart = Date.now();
        const response = await fetch(httpFallbackUrl, {
          method: 'GET',
          timeout: 10000,
          redirect: 'follow',
          headers: {
            'User-Agent': 'WebsiteStatusMonitor/1.0'
          }
        });

        const responseTime = Date.now() - retryStart;
        const isUp = response.ok;
        const finalUrl = response.url || httpFallbackUrl;

        if (isUp) {
          console.log(`[  OK ] ${name} — ${response.status} in ${responseTime}ms [HTTP fallback, no SSL]`);
        } else {
          console.warn(`[WARN ] ${name} — HTTP fallback ${response.status} ${response.statusText} in ${responseTime}ms`);
        }

        return {
          url: finalUrl,
          status: response.status,
          statusText: response.statusText,
          isUp,
          responseTime,
          ssl: false,
          sslError: error.message,
          timestamp: new Date().toISOString()
        };
      } catch (fallbackError) {
        // Both HTTPS and HTTP failed
        const responseTime = Date.now() - startTime;
        console.error(`[FAIL ] ${name} — both HTTPS and HTTP failed (${fallbackError.message})`);

        return {
          url,
          status: 0,
          statusText: fallbackError.message,
          isUp: false,
          responseTime,
          ssl: false,
          sslError: error.message,
          timestamp: new Date().toISOString(),
          error: `HTTPS: ${error.message}; HTTP: ${fallbackError.message}`
        };
      }
    }

    const responseTime = Date.now() - startTime;
    console.error(`[FAIL ] ${name} — ${error.message} (${responseTime}ms)`);

    return {
      url,
      status: 0,
      statusText: error.message,
      isUp: false,
      responseTime,
      ssl: false,
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

  if (!process.env.SENDGRID_API_KEY || !process.env.ALERT_EMAIL || !process.env.FROM_EMAIL) {
    console.warn('[ALERT] Skipping email — missing SENDGRID_API_KEY, ALERT_EMAIL, or FROM_EMAIL');
    return { sent: false, error: 'Missing email configuration' };
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
    console.log(`[ALERT] Email sent to ${process.env.ALERT_EMAIL} — ${downSites.length} site(s) down`);

    // Log alert history for each affected site
    await Promise.all(downSites.map(site =>
      saveAlertHistory({
        websiteId: site.websiteId,
        type: 'down',
        recipient: process.env.ALERT_EMAIL,
        subject,
        success: true
      }).catch(err => console.error(`[ALERT] Failed to log alert history for ${site.websiteId}:`, err))
    ));

    return { sent: true, downSites: downSites.length };
  } catch (error) {
    console.error(`[ALERT] SendGrid error: ${error.message}`);

    // Log the failed alert attempt
    await Promise.all(downSites.map(site =>
      saveAlertHistory({
        websiteId: site.websiteId,
        type: 'down',
        recipient: process.env.ALERT_EMAIL,
        subject,
        success: false,
        error: error.message
      }).catch(() => {})
    ));

    return { sent: false, error: error.message };
  }
}

/**
 * Main monitoring function
 */
const monitorHandler = async (event, context) => {
  const runStart = Date.now();
  console.log('='.repeat(60));
  console.log(`[START] Website monitor check — ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  try {
    // Load websites and clients from Supabase
    console.log('[LOAD ] Fetching websites and clients from Supabase...');
    let websites, clients;
    try {
      [websites, clients] = await Promise.all([
        getAllWebsites(),
        getAllClients()
      ]);
    } catch (err) {
      console.error(`[FATAL] Failed to load data from Supabase: ${err.message}`);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to connect to Supabase', detail: err.message })
      };
    }

    console.log(`[LOAD ] Found ${websites.length} websites, ${clients.length} clients`);

    if (websites.length === 0) {
      console.warn('[LOAD ] No websites to check — exiting');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No websites configured', timestamp: new Date().toISOString() })
      };
    }

    // Create a client lookup map
    const clientMap = {};
    clients.forEach(client => {
      clientMap[client.id] = client;
    });

    // Get active incidents to track recovery
    let activeIncidents = [];
    try {
      activeIncidents = await getActiveIncidents();
    } catch (err) {
      console.warn(`[WARN ] Failed to load active incidents: ${err.message} — continuing without incident tracking`);
    }

    const activeIncidentsByWebsite = {};
    activeIncidents.forEach(inc => {
      if (!activeIncidentsByWebsite[inc.website_id]) {
        activeIncidentsByWebsite[inc.website_id] = [];
      }
      activeIncidentsByWebsite[inc.website_id].push(inc);
    });

    if (activeIncidents.length > 0) {
      console.log(`[LOAD ] ${activeIncidents.length} active incident(s) being tracked`);
    }

    // Check all websites
    console.log(`[CHECK] Checking ${websites.length} websites...`);
    console.log('-'.repeat(60));

    const results = await Promise.all(
      websites.map(async (site) => {
        const result = await checkWebsite(site);

        // Attach additional metadata
        result.name = site.name || site.url;
        result.websiteId = site.id;
        result.clientId = site.client_id || null;
        result.client = site.client_id ? clientMap[site.client_id] : null;

        // Save check result to Supabase
        try {
          await saveMonitorCheck({
            websiteId: site.id,
            timestamp: result.timestamp,
            status: result.isUp ? 'up' : 'down',
            responseTime: result.responseTime,
            statusCode: result.status,
            error: result.error || null,
            issues: [],
            metadata: {
              ssl: result.ssl,
              sslError: result.sslError || null
            }
          });
        } catch (err) {
          console.error(`[DB   ] Failed to save check for ${site.name}: ${err.message}`);
        }

        // Handle incident tracking
        const siteActiveIncidents = activeIncidentsByWebsite[site.id] || [];

        try {
          if (!result.isUp && siteActiveIncidents.length === 0) {
            await createIncident({
              websiteId: site.id,
              startedAt: result.timestamp,
              type: 'down',
              severity: 'critical',
              message: `${site.name} is down: ${result.error || `HTTP ${result.status}`}`
            });
            console.log(`[INCID] Created incident for ${site.name}`);
          } else if (result.isUp && siteActiveIncidents.length > 0) {
            await Promise.all(
              siteActiveIncidents.map(inc => resolveIncident(inc.id, result.timestamp))
            );
            console.log(`[RECOV] ${site.name} recovered — resolved ${siteActiveIncidents.length} incident(s)`);
          }
        } catch (err) {
          console.error(`[INCID] Failed to update incidents for ${site.name}: ${err.message}`);
        }

        return result;
      })
    );

    // Summary
    const sitesUp = results.filter(r => r.isUp).length;
    const sitesDown = results.filter(r => !r.isUp).length;

    console.log('-'.repeat(60));
    console.log(`[DONE ] ${results.length} checked — ${sitesUp} up, ${sitesDown} down`);

    // Send alerts if any sites are down
    let alertResult = null;
    if (sitesDown > 0) {
      console.log(`[ALERT] ${sitesDown} site(s) down — sending alert...`);
      alertResult = await sendAlert(results);
    }

    // Group results by client
    const byClient = groupByClient(results);

    const duration = Date.now() - runStart;
    console.log(`[END  ] Monitor run complete in ${duration}ms`);
    console.log('='.repeat(60));

    return {
      statusCode: 200,
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        duration,
        totalChecked: results.length,
        sitesUp,
        sitesDown,
        results,
        byClient,
        alertSent: alertResult
      }, null, 2)
    };
  } catch (error) {
    const duration = Date.now() - runStart;
    console.error(`[FATAL] Monitor run failed after ${duration}ms: ${error.message}`);
    console.error(error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

exports.handler = schedule("*/5 * * * *", monitorHandler);

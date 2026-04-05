const { schedule } = require('@netlify/functions');
const fetch = require('node-fetch');
const sgMail = require('@sendgrid/mail');
const { visualCheck } = require('./lib/visual-check');
const { runCustomChecks } = require('./lib/custom-checks');
const {
  getAllWebsites,
  getAllClients,
  saveMonitorCheck,
  createIncident,
  resolveIncident,
  getActiveIncidents,
  saveAlertHistory,
  uploadBaseline,
  getBaselineUrl,
  uploadScreenshot
} = require('./lib/supabase');

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Check if a website is up and responding
 */
async function checkWebsite(url) {
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'WebsiteStatusMonitor/2.0'
      }
    });

    const responseTime = Date.now() - startTime;
    const isUp = response.ok;

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
 * Run enhanced checks (visual + custom)
 * Uses Supabase storage for baselines instead of file system
 */
async function runEnhancedChecks(site) {
  const results = {
    visual: null,
    custom: null
  };

  // Run visual check if configured
  if (site.visual_check_enabled) {
    const websiteId = site.id;

    // Load baseline from Supabase storage
    const baselineUrl = await getBaselineUrl(websiteId);
    let baseline = null;
    if (baselineUrl) {
      try {
        const res = await fetch(baselineUrl);
        if (res.ok) {
          baseline = Buffer.from(await res.arrayBuffer());
        }
      } catch (err) {
        console.error(`Failed to fetch baseline for ${websiteId}:`, err);
      }
    }

    const visualResult = await visualCheck(site.url, baseline, {
      threshold: 5.0,
      fullPage: false
    });

    // If this is a new baseline, save it to Supabase storage
    if (visualResult.success && visualResult.isBaseline) {
      await uploadBaseline(websiteId, visualResult.screenshot);
    }

    // Save current screenshot to Supabase storage
    if (visualResult.success && visualResult.screenshot) {
      const filename = `check-${Date.now()}.png`;
      await uploadScreenshot(websiteId, visualResult.screenshot, filename);
    }

    results.visual = visualResult;
  }

  // Run custom checks if configured
  if (site.custom_checks && site.custom_checks.length > 0) {
    const customResult = await runCustomChecks(site.url, site.custom_checks);
    results.custom = customResult;
  }

  return results;
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
 * Collect issues from enhanced check results
 */
function collectIssues(enhanced) {
  const issues = [];

  if (enhanced?.visual?.hasChanged) {
    issues.push({
      type: 'visual-change',
      message: `Visual difference: ${enhanced.visual.diffPercentage}%`
    });
  }

  if (enhanced?.custom?.results) {
    enhanced.custom.results
      .filter(c => !c.passed)
      .forEach(c => {
        issues.push({
          type: 'custom-check',
          message: `${c.checkName}: ${c.message}`
        });
      });
  }

  return issues;
}

/**
 * Send email alert via SendGrid
 */
async function sendAlert(results) {
  const issues = results.filter(r =>
    !r.isUp ||
    (r.enhanced?.visual?.hasChanged) ||
    (r.enhanced?.custom?.results?.some(c => !c.passed))
  );

  if (issues.length === 0) {
    return null;
  }

  let emailBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #e74c3c;">⚠️ Website Monitoring Alert</h2>
  <p style="font-size: 16px; color: #333;">
    <strong>${issues.length}</strong> website${issues.length > 1 ? 's have' : ' has'} issues detected.
  </p>
`;

  const grouped = groupByClient(issues);

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
      const issueTypes = [];
      if (!site.isUp) issueTypes.push('🔴 Down');
      if (site.enhanced?.visual?.hasChanged) issueTypes.push('🎨 Visual Changes');
      if (site.enhanced?.custom?.results?.some(c => !c.passed)) issueTypes.push('🎯 Custom Check Failed');

      emailBody += `
    <div style="border-left: 4px solid #e74c3c; padding: 12px; margin: 10px 0; background: #f8f9fa; border-radius: 4px;">
      <strong style="color: #e74c3c;">${issueTypes.join(' ')} ${site.name}</strong><br/>
      <small style="color: #666;">URL: ${site.url}</small><br/>
`;

      if (!site.isUp) {
        emailBody += `
      <small style="color: #666;">Status: ${site.status || 'Unreachable'} - ${site.statusText}</small><br/>
`;
      }

      if (site.enhanced?.visual?.hasChanged) {
        emailBody += `
      <small style="color: #e67e22;">Visual difference: ${site.enhanced.visual.diffPercentage}%</small><br/>
`;
      }

      if (site.enhanced?.custom?.results) {
        const failed = site.enhanced.custom.results.filter(c => !c.passed);
        if (failed.length > 0) {
          emailBody += `
      <small style="color: #e67e22;">Failed checks:</small><br/>
`;
          failed.forEach(check => {
            emailBody += `
        <small style="color: #999;">• ${check.checkName}: ${check.message}</small><br/>
`;
          });
        }
      }

      emailBody += `
      <small style="color: #999;">Time: ${new Date(site.timestamp).toLocaleString()}</small><br/>
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
    Monitoring via Website Status Monitor v2.0
  </p>
</div>
`;

  const subject = `🚨 Website Alert - ${issues.length} issue(s) detected`;
  const msg = {
    to: process.env.ALERT_EMAIL,
    from: process.env.FROM_EMAIL,
    subject,
    html: emailBody,
  };

  try {
    await sgMail.send(msg);

    // Log alert history for each affected site
    await Promise.all(issues.map(site =>
      saveAlertHistory({
        websiteId: site.websiteId,
        type: site.isUp ? 'issue' : 'down',
        recipient: process.env.ALERT_EMAIL,
        subject,
        success: true
      }).catch(err => console.error(`Failed to log alert for ${site.websiteId}:`, err))
    ));

    return { sent: true, issues: issues.length };
  } catch (error) {
    console.error('SendGrid error:', error);
    return { sent: false, error: error.message };
  }
}

/**
 * Main monitoring function (Enhanced Phase 2)
 */
const monitorHandler = async (event, context) => {
  console.log('Starting enhanced website monitoring check (Phase 2)...');

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

    // Check all websites with enhanced features
    const results = await Promise.all(
      websites.map(async (site) => {
        // Basic uptime check
        const result = await checkWebsite(site.url);

        // Attach metadata
        result.name = site.name || site.url;
        result.websiteId = site.id;
        result.clientId = site.client_id || null;
        result.client = site.client_id ? clientMap[site.client_id] : null;

        // Run enhanced checks if site is up
        if (result.isUp && (site.visual_check_enabled || (site.custom_checks && site.custom_checks.length > 0))) {
          try {
            result.enhanced = await runEnhancedChecks(site);
          } catch (error) {
            console.error(`Enhanced checks failed for ${site.name}:`, error);
            result.enhanced = { error: error.message };
          }
        }

        // Collect issues from enhanced checks
        const issues = collectIssues(result.enhanced);

        // Save check result to Supabase
        await saveMonitorCheck({
          websiteId: site.id,
          timestamp: result.timestamp,
          status: result.isUp ? 'up' : 'down',
          responseTime: result.responseTime,
          statusCode: result.status,
          error: result.error || null,
          issues,
          metadata: result.enhanced ? {
            visual: result.enhanced.visual ? {
              hasChanged: result.enhanced.visual.hasChanged,
              diffPercentage: result.enhanced.visual.diffPercentage
            } : null,
            customChecks: result.enhanced.custom ? {
              total: result.enhanced.custom.results?.length || 0,
              passed: result.enhanced.custom.results?.filter(c => c.passed).length || 0
            } : null
          } : {}
        });

        // Handle incident tracking
        const siteActiveIncidents = activeIncidentsByWebsite[site.id] || [];
        const hasIssues = !result.isUp || issues.length > 0;

        if (hasIssues && siteActiveIncidents.length === 0) {
          // New incident
          const incidentType = !result.isUp ? 'down' : 'issue';
          const message = !result.isUp
            ? `${site.name} is down: ${result.error || `HTTP ${result.status}`}`
            : `${site.name} has issues: ${issues.map(i => i.message).join(', ')}`;

          await createIncident({
            websiteId: site.id,
            startedAt: result.timestamp,
            type: incidentType,
            severity: !result.isUp ? 'critical' : 'warning',
            message,
            metadata: { issues }
          });
        } else if (!hasIssues && siteActiveIncidents.length > 0) {
          // Recovered — resolve active incidents
          await Promise.all(
            siteActiveIncidents.map(inc =>
              resolveIncident(inc.id, result.timestamp)
            )
          );
        }

        return result;
      })
    );

    // Send alerts if issues detected
    const alertResult = await sendAlert(results);

    // Group results by client
    const byClient = groupByClient(results);

    // Calculate stats
    const stats = {
      totalChecked: results.length,
      sitesUp: results.filter(r => r.isUp).length,
      sitesDown: results.filter(r => !r.isUp).length,
      visualChanges: results.filter(r => r.enhanced?.visual?.hasChanged).length,
      customChecksFailed: results.filter(r =>
        r.enhanced?.custom?.results?.some(c => !c.passed)
      ).length
    };

    // Prepare response
    const response = {
      version: '2.0-phase2',
      timestamp: new Date().toISOString(),
      stats,
      results,
      byClient,
      alertSent: alertResult
    };

    console.log('Enhanced monitoring check complete:', stats);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(response, null, 2)
    };
  } catch (error) {
    console.error('Monitoring error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};

exports.handler = schedule("*/15 * * * *", monitorHandler);

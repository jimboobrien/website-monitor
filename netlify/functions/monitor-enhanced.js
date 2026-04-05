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
async function checkWebsite(site) {
  const startTime = Date.now();
  const url = site.url;
  const name = site.name || url;

  console.log(`[CHECK] ${name} — ${url}`);

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

    if (isUp) {
      console.log(`[  OK ] ${name} — ${response.status} in ${responseTime}ms`);
    } else {
      console.warn(`[WARN ] ${name} — HTTP ${response.status} ${response.statusText} in ${responseTime}ms`);
    }

    return {
      url,
      status: response.status,
      statusText: response.statusText,
      isUp,
      responseTime,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`[FAIL ] ${name} — ${error.message} (${responseTime}ms)`);

    return {
      url,
      status: 0,
      statusText: error.message,
      isUp: false,
      responseTime,
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
  const name = site.name || site.url;

  // Run visual check if configured
  if (site.visual_check_enabled) {
    const websiteId = site.id;
    console.log(`[VISUAL] ${name} — loading baseline...`);

    // Load baseline from Supabase storage
    let baseline = null;
    try {
      const baselineUrl = await getBaselineUrl(websiteId);
      if (baselineUrl) {
        const res = await fetch(baselineUrl);
        if (res.ok) {
          baseline = Buffer.from(await res.arrayBuffer());
          console.log(`[VISUAL] ${name} — baseline loaded (${(baseline.length / 1024).toFixed(1)}KB)`);
        } else {
          console.warn(`[VISUAL] ${name} — baseline fetch returned ${res.status}`);
        }
      } else {
        console.log(`[VISUAL] ${name} — no baseline exists, will create one`);
      }
    } catch (err) {
      console.error(`[VISUAL] ${name} — failed to fetch baseline: ${err.message}`);
    }

    try {
      console.log(`[VISUAL] ${name} — taking screenshot...`);
      const visualResult = await visualCheck(site.url, baseline, {
        threshold: 5.0,
        fullPage: false
      });

      if (visualResult.success && visualResult.isBaseline) {
        console.log(`[VISUAL] ${name} — saving new baseline`);
        await uploadBaseline(websiteId, visualResult.screenshot);
      } else if (visualResult.success && visualResult.hasChanged) {
        console.warn(`[VISUAL] ${name} — visual change detected: ${visualResult.diffPercentage}% diff`);
      } else if (visualResult.success) {
        console.log(`[VISUAL] ${name} — no change (${visualResult.diffPercentage || 0}% diff)`);
      }

      // Save current screenshot
      if (visualResult.success && visualResult.screenshot) {
        const filename = `check-${Date.now()}.png`;
        try {
          await uploadScreenshot(websiteId, visualResult.screenshot, filename);
        } catch (err) {
          console.error(`[VISUAL] ${name} — failed to upload screenshot: ${err.message}`);
        }
      }

      results.visual = visualResult;
    } catch (err) {
      console.error(`[VISUAL] ${name} — visual check failed: ${err.message}`);
      results.visual = { success: false, error: err.message };
    }
  }

  // Run custom checks if configured
  if (site.custom_checks && site.custom_checks.length > 0) {
    console.log(`[CUSTOM] ${name} — running ${site.custom_checks.length} custom check(s)...`);
    try {
      const customResult = await runCustomChecks(site.url, site.custom_checks);
      const passed = customResult.results?.filter(c => c.passed).length || 0;
      const total = customResult.results?.length || 0;
      console.log(`[CUSTOM] ${name} — ${passed}/${total} checks passed`);
      results.custom = customResult;
    } catch (err) {
      console.error(`[CUSTOM] ${name} — custom checks failed: ${err.message}`);
      results.custom = { error: err.message, results: [] };
    }
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
  const issueResults = results.filter(r =>
    !r.isUp ||
    (r.enhanced?.visual?.hasChanged) ||
    (r.enhanced?.custom?.results?.some(c => !c.passed))
  );

  if (issueResults.length === 0) {
    return null;
  }

  if (!process.env.SENDGRID_API_KEY || !process.env.ALERT_EMAIL || !process.env.FROM_EMAIL) {
    console.warn('[ALERT] Skipping email — missing SENDGRID_API_KEY, ALERT_EMAIL, or FROM_EMAIL');
    return { sent: false, error: 'Missing email configuration' };
  }

  let emailBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #e74c3c;">⚠️ Website Monitoring Alert</h2>
  <p style="font-size: 16px; color: #333;">
    <strong>${issueResults.length}</strong> website${issueResults.length > 1 ? 's have' : ' has'} issues detected.
  </p>
`;

  const grouped = groupByClient(issueResults);

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

  const subject = `🚨 Website Alert - ${issueResults.length} issue(s) detected`;
  const msg = {
    to: process.env.ALERT_EMAIL,
    from: process.env.FROM_EMAIL,
    subject,
    html: emailBody,
  };

  try {
    await sgMail.send(msg);
    console.log(`[ALERT] Email sent to ${process.env.ALERT_EMAIL} — ${issueResults.length} site(s) with issues`);

    // Log alert history for each affected site
    await Promise.all(issueResults.map(site =>
      saveAlertHistory({
        websiteId: site.websiteId,
        type: site.isUp ? 'issue' : 'down',
        recipient: process.env.ALERT_EMAIL,
        subject,
        success: true
      }).catch(err => console.error(`[ALERT] Failed to log alert history for ${site.websiteId}:`, err))
    ));

    return { sent: true, issues: issueResults.length };
  } catch (error) {
    console.error(`[ALERT] SendGrid error: ${error.message}`);

    // Log the failed alert attempt
    await Promise.all(issueResults.map(site =>
      saveAlertHistory({
        websiteId: site.websiteId,
        type: site.isUp ? 'issue' : 'down',
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
 * Main monitoring function (Enhanced Phase 2)
 */
const monitorHandler = async (event, context) => {
  const runStart = Date.now();
  console.log('='.repeat(60));
  console.log(`[START] Enhanced monitor check — ${new Date().toISOString()}`);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to connect to Supabase', detail: err.message })
      };
    }

    console.log(`[LOAD ] Found ${websites.length} websites, ${clients.length} clients`);

    const enhancedSites = websites.filter(s => s.visual_check_enabled || (s.custom_checks && s.custom_checks.length > 0));
    console.log(`[LOAD ] ${enhancedSites.length} site(s) have enhanced checks enabled`);

    if (websites.length === 0) {
      console.warn('[LOAD ] No websites to check — exiting');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
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

    // Check all websites with enhanced features
    console.log(`[CHECK] Checking ${websites.length} websites...`);
    console.log('-'.repeat(60));

    const results = await Promise.all(
      websites.map(async (site) => {
        const result = await checkWebsite(site);

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
            console.error(`[ENH  ] Enhanced checks failed for ${site.name}: ${error.message}`);
            result.enhanced = { error: error.message };
          }
        }

        // Collect issues from enhanced checks
        const issues = collectIssues(result.enhanced);

        // Save check result to Supabase
        try {
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
        } catch (err) {
          console.error(`[DB   ] Failed to save check for ${site.name}: ${err.message}`);
        }

        // Handle incident tracking
        const siteActiveIncidents = activeIncidentsByWebsite[site.id] || [];
        const hasIssues = !result.isUp || issues.length > 0;

        try {
          if (hasIssues && siteActiveIncidents.length === 0) {
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
            console.log(`[INCID] Created ${incidentType} incident for ${site.name}`);
          } else if (!hasIssues && siteActiveIncidents.length > 0) {
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

    // Summary stats
    const stats = {
      totalChecked: results.length,
      sitesUp: results.filter(r => r.isUp).length,
      sitesDown: results.filter(r => !r.isUp).length,
      visualChanges: results.filter(r => r.enhanced?.visual?.hasChanged).length,
      customChecksFailed: results.filter(r =>
        r.enhanced?.custom?.results?.some(c => !c.passed)
      ).length
    };

    console.log('-'.repeat(60));
    console.log(`[DONE ] ${stats.totalChecked} checked — ${stats.sitesUp} up, ${stats.sitesDown} down`);
    if (stats.visualChanges > 0) {
      console.warn(`[DONE ] ${stats.visualChanges} visual change(s) detected`);
    }
    if (stats.customChecksFailed > 0) {
      console.warn(`[DONE ] ${stats.customChecksFailed} site(s) with custom check failures`);
    }

    // Send alerts if issues detected
    let alertResult = null;
    const totalIssues = stats.sitesDown + stats.visualChanges + stats.customChecksFailed;
    if (totalIssues > 0) {
      console.log(`[ALERT] ${totalIssues} issue(s) found — sending alert...`);
      alertResult = await sendAlert(results);
    }

    // Group results by client
    const byClient = groupByClient(results);

    const duration = Date.now() - runStart;
    console.log(`[END  ] Enhanced monitor run complete in ${duration}ms`);
    console.log('='.repeat(60));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: '2.0-phase2',
        timestamp: new Date().toISOString(),
        duration,
        stats,
        results,
        byClient,
        alertSent: alertResult
      }, null, 2)
    };
  } catch (error) {
    const duration = Date.now() - runStart;
    console.error(`[FATAL] Enhanced monitor run failed after ${duration}ms: ${error.message}`);
    console.error(error.stack);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};

exports.handler = schedule("0 6 * * *", monitorHandler);

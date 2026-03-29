const { schedule } = require('@netlify/functions');
const fetch = require('node-fetch');
const sgMail = require('@sendgrid/mail');
const { visualCheck } = require('./lib/visual-check');
const { runCustomChecks } = require('./lib/custom-checks');
const { saveBaseline, loadBaseline, saveHistory } = require('./lib/storage');

// Load configuration
const config = require('../../config.json');

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
 */
async function runEnhancedChecks(site) {
  const results = {
    visual: null,
    custom: null
  };

  // Run visual check if configured
  if (site.visualCheck && site.visualCheck.enabled) {
    const websiteId = site.id || site.name.toLowerCase().replace(/\s+/g, '-');
    
    // Load baseline
    const baselineResult = await loadBaseline(websiteId);
    const baseline = baselineResult.success ? baselineResult.data : null;
    
    const visualResult = await visualCheck(site.url, baseline, {
      threshold: site.visualCheck.threshold || 5.0,
      fullPage: site.visualCheck.fullPage || false,
      waitForSelector: site.visualCheck.waitForSelector
    });
    
    // If this is a new baseline, save it
    if (visualResult.success && visualResult.isBaseline) {
      await saveBaseline(websiteId, visualResult.screenshot);
    }
    
    results.visual = visualResult;
  }

  // Run custom checks if configured
  if (site.customChecks && site.customChecks.length > 0) {
    const customResult = await runCustomChecks(site.url, site.customChecks);
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
  
  const groupByClientEnabled = config.notificationSettings?.groupByClient;
  
  let emailBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #e74c3c;">⚠️ Website Monitoring Alert</h2>
  <p style="font-size: 16px; color: #333;">
    <strong>${issues.length}</strong> website${issues.length > 1 ? 's have' : ' has'} issues detected.
  </p>
`;

  if (groupByClientEnabled) {
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
        
        // Uptime issues
        if (!site.isUp) {
          emailBody += `
      <small style="color: #666;">Status: ${site.status || 'Unreachable'} - ${site.statusText}</small><br/>
`;
        }
        
        // Visual check issues
        if (site.enhanced?.visual?.hasChanged) {
          emailBody += `
      <small style="color: #e67e22;">Visual difference: ${site.enhanced.visual.diffPercentage}% (threshold: ${site.enhanced.visual.threshold}%)</small><br/>
`;
        }
        
        // Custom check failures
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
  } else {
    // Flat list
    issues.forEach(site => {
      const issueTypes = [];
      if (!site.isUp) issueTypes.push('🔴 Down');
      if (site.enhanced?.visual?.hasChanged) issueTypes.push('🎨 Visual');
      if (site.enhanced?.custom?.results?.some(c => !c.passed)) issueTypes.push('🎯 Custom');
      
      emailBody += `
  <div style="border-left: 4px solid #e74c3c; padding: 12px; margin: 10px 0; background: #f8f9fa; border-radius: 4px;">
    <strong style="color: #e74c3c;">${issueTypes.join(' ')} ${site.name}</strong><br/>
    <small style="color: #666;">URL: ${site.url}</small><br/>
    <small style="color: #999;">Time: ${new Date(site.timestamp).toLocaleString()}</small><br/>
  </div>
`;
    });
  }
  
  emailBody += `
  <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;"/>
  <p style="color: #999; font-size: 12px;">
    Checked at: ${new Date().toLocaleString()}<br/>
    Monitoring via Website Status Monitor v2.0
  </p>
</div>
`;

  const msg = {
    to: process.env.ALERT_EMAIL,
    from: process.env.FROM_EMAIL,
    subject: `🚨 Website Alert - ${issues.length} issue(s) detected`,
    html: emailBody,
  };

  try {
    await sgMail.send(msg);
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
    // Create a client lookup map
    const clientMap = {};
    if (config.clients) {
      config.clients.forEach(client => {
        clientMap[client.id] = client;
      });
    }
    
    // Check all websites with enhanced features
    const results = await Promise.all(
      config.websites.map(async (site) => {
        // Basic uptime check
        const result = await checkWebsite(site.url);
        
        // Attach metadata
        result.name = site.name || site.url;
        result.clientId = site.clientId || null;
        result.client = site.clientId ? clientMap[site.clientId] : null;
        
        // Run enhanced checks if site is up
        if (result.isUp && (site.visualCheck || site.customChecks)) {
          try {
            result.enhanced = await runEnhancedChecks(site);
          } catch (error) {
            console.error(`Enhanced checks failed for ${site.name}:`, error);
            result.enhanced = { error: error.message };
          }
        }
        
        // Save to history
        await saveHistory(site.id || site.name.toLowerCase().replace(/\s+/g, '-'), {
          isUp: result.isUp,
          responseTime: result.responseTime,
          status: result.status,
          enhanced: result.enhanced
        });
        
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

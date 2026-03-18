const fetch = require('node-fetch');
const sgMail = require('@sendgrid/mail');

// Load configuration
const config = require('../../config.json');

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
 * Send email alert via SendGrid
 */
async function sendAlert(results) {
  const downSites = results.filter(r => !r.isUp);
  
  if (downSites.length === 0) {
    return null;
  }
  
  const emailBody = `
<h2>⚠️ Website Status Alert</h2>
<p>The following websites are currently down or unreachable:</p>

${downSites.map(site => `
<div style="border-left: 4px solid #e74c3c; padding: 10px; margin: 10px 0; background: #f8f9fa;">
  <strong>🔴 ${site.url}</strong><br/>
  <small>Status: ${site.status || 'Unreachable'} - ${site.statusText}</small><br/>
  <small>Time: ${site.timestamp}</small><br/>
  ${site.error ? `<small>Error: ${site.error}</small>` : ''}
</div>
`).join('')}

<hr/>
<p><small>Checked at: ${new Date().toISOString()}</small></p>
`;

  const msg = {
    to: process.env.ALERT_EMAIL,
    from: process.env.FROM_EMAIL,
    subject: `🚨 Website Down Alert - ${downSites.length} site(s) affected`,
    html: emailBody,
  };

  try {
    await sgMail.send(msg);
    return { sent: true, downSites: downSites.length };
  } catch (error) {
    console.error('SendGrid error:', error);
    return { sent: false, error: error.message };
  }
}

/**
 * Main monitoring function
 */
exports.handler = async (event, context) => {
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
    // Check all websites
    const results = await Promise.all(
      config.websites.map(site => checkWebsite(site.url))
    );
    
    // Send alerts if any sites are down
    const alertResult = await sendAlert(results);
    
    // Prepare response
    const response = {
      timestamp: new Date().toISOString(),
      totalChecked: results.length,
      sitesUp: results.filter(r => r.isUp).length,
      sitesDown: results.filter(r => !r.isUp).length,
      results: results,
      alertSent: alertResult
    };
    
    console.log('Monitoring check complete:', response);
    
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

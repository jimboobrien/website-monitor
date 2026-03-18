const { listSnapshots } = require('./lib/snapshot');
const config = require('../../config.json');

/**
 * Snapshot viewer - Interactive HTML interface for browsing snapshots
 */
exports.handler = async (event, context) => {
  const { queryStringParameters = {} } = event;
  const websiteId = queryStringParameters.websiteId || queryStringParameters.id;
  
  // Build website list
  const websites = config.websites.map(w => ({
    id: w.id || w.name.toLowerCase().replace(/\s+/g, '-'),
    name: w.name,
    url: w.url,
    clientId: w.clientId
  }));
  
  let snapshotsList = '';
  let selectedWebsite = null;
  
  if (websiteId) {
    selectedWebsite = websites.find(w => w.id === websiteId);
    const list = await listSnapshots(websiteId);
    
    if (list.success && list.snapshots.length > 0) {
      snapshotsList = list.snapshots.map(s => `
        <div class="snapshot-card">
          <div class="snapshot-header">
            <h3>${new Date(s.timestamp).toLocaleString()}</h3>
            <span class="snapshot-meta">${s.metadata?.title || 'Untitled'}</span>
          </div>
          <div class="snapshot-actions">
            <a href="/.netlify/functions/snapshot?action=view&websiteId=${websiteId}&timestamp=${s.timestamp}&format=png" 
               target="_blank" class="btn btn-primary">
              📸 View Screenshot
            </a>
            <a href="/.netlify/functions/snapshot?action=view&websiteId=${websiteId}&timestamp=${s.timestamp}&format=html" 
               target="_blank" class="btn btn-secondary">
              📄 View HTML
            </a>
            <a href="/.netlify/functions/snapshot?action=view&websiteId=${websiteId}&timestamp=${s.timestamp}" 
               target="_blank" class="btn btn-info">
              📊 Metadata
            </a>
          </div>
          <div class="snapshot-info">
            <small>URL: ${s.url}</small><br/>
            <small>Size: ${s.hasScreenshot ? '✓ Screenshot' : ''} ${s.hasHTML ? '✓ HTML' : ''}</small>
          </div>
        </div>
      `).join('');
    } else {
      snapshotsList = `
        <div class="empty-state">
          <p>📸 No snapshots yet for this website.</p>
          <p>
            <a href="/.netlify/functions/snapshot?action=capture&websiteId=${websiteId}" 
               class="btn btn-primary">
              Take First Snapshot
            </a>
          </p>
        </div>
      `;
    }
  }
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Website Snapshots - Time Machine</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #333;
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .header {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .header h1 {
      color: #667eea;
      font-size: 2.5em;
      margin-bottom: 10px;
    }
    
    .header p {
      color: #666;
      font-size: 1.1em;
    }
    
    .website-selector {
      background: white;
      border-radius: 12px;
      padding: 25px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .website-selector h2 {
      margin-bottom: 20px;
      color: #333;
    }
    
    .website-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 15px;
    }
    
    .website-card {
      background: #f8f9fa;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      padding: 15px;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      color: inherit;
      display: block;
    }
    
    .website-card:hover {
      border-color: #667eea;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(102, 126, 234, 0.2);
    }
    
    .website-card.active {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }
    
    .website-card h3 {
      font-size: 1.1em;
      margin-bottom: 5px;
    }
    
    .website-card p {
      font-size: 0.9em;
      opacity: 0.8;
    }
    
    .snapshots-container {
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .snapshots-container h2 {
      margin-bottom: 20px;
      color: #333;
    }
    
    .snapshot-card {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      border-left: 4px solid #667eea;
    }
    
    .snapshot-header h3 {
      color: #333;
      margin-bottom: 5px;
    }
    
    .snapshot-meta {
      color: #666;
      font-size: 0.9em;
    }
    
    .snapshot-actions {
      margin: 15px 0;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    
    .snapshot-info {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #dee2e6;
      color: #666;
      font-size: 0.9em;
    }
    
    .btn {
      display: inline-block;
      padding: 10px 20px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.2s;
      border: none;
      cursor: pointer;
      font-size: 0.95em;
    }
    
    .btn-primary {
      background: #667eea;
      color: white;
    }
    
    .btn-primary:hover {
      background: #5568d3;
      transform: translateY(-1px);
    }
    
    .btn-secondary {
      background: #6c757d;
      color: white;
    }
    
    .btn-secondary:hover {
      background: #5a6268;
    }
    
    .btn-info {
      background: #17a2b8;
      color: white;
    }
    
    .btn-info:hover {
      background: #138496;
    }
    
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }
    
    .empty-state p {
      margin-bottom: 20px;
      font-size: 1.1em;
    }
    
    .api-docs {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin-top: 20px;
      font-size: 0.9em;
    }
    
    .api-docs h3 {
      margin-bottom: 15px;
      color: #333;
    }
    
    .api-docs code {
      background: #e9ecef;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📸 Website Time Machine</h1>
      <p>Browse historical snapshots of your monitored websites</p>
    </div>
    
    <div class="website-selector">
      <h2>Select a Website</h2>
      <div class="website-grid">
        ${websites.map(w => `
          <a href="?websiteId=${w.id}" class="website-card ${websiteId === w.id ? 'active' : ''}">
            <h3>${w.name}</h3>
            <p>${w.url}</p>
          </a>
        `).join('')}
      </div>
    </div>
    
    ${websiteId ? `
      <div class="snapshots-container">
        <h2>Snapshots for ${selectedWebsite?.name || websiteId}</h2>
        ${snapshotsList}
        
        <div class="api-docs">
          <h3>📡 API Endpoints</h3>
          <p><strong>Capture a snapshot:</strong><br/>
          <code>GET /.netlify/functions/snapshot?action=capture&websiteId=${websiteId}</code></p>
          
          <p><strong>List snapshots:</strong><br/>
          <code>GET /.netlify/functions/snapshot?action=list&websiteId=${websiteId}</code></p>
          
          <p><strong>View snapshot (JSON):</strong><br/>
          <code>GET /.netlify/functions/snapshot?action=view&websiteId=${websiteId}&timestamp=TIMESTAMP</code></p>
        </div>
      </div>
    ` : `
      <div class="snapshots-container">
        <div class="empty-state">
          <p>👆 Select a website above to view its snapshots</p>
        </div>
      </div>
    `}
  </div>
</body>
</html>
  `;
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: html
  };
};

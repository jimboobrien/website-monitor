const fs = require('fs').promises;
const path = require('path');

// Simple file-based storage for baselines and history
// In production, you might use Netlify Blobs, S3, or a database

const STORAGE_DIR = '/tmp/website-monitor';
const BASELINES_DIR = path.join(STORAGE_DIR, 'baselines');
const HISTORY_DIR = path.join(STORAGE_DIR, 'history');

/**
 * Initialize storage directories
 */
async function initStorage() {
  try {
    await fs.mkdir(BASELINES_DIR, { recursive: true });
    await fs.mkdir(HISTORY_DIR, { recursive: true });
  } catch (error) {
    console.error('Storage init error:', error);
  }
}

/**
 * Save baseline screenshot
 */
async function saveBaseline(websiteId, screenshot) {
  try {
    await initStorage();
    const filename = `${websiteId}.png`;
    const filepath = path.join(BASELINES_DIR, filename);
    await fs.writeFile(filepath, screenshot);
    return { success: true, path: filepath };
  } catch (error) {
    console.error('Save baseline error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Load baseline screenshot
 */
async function loadBaseline(websiteId) {
  try {
    const filename = `${websiteId}.png`;
    const filepath = path.join(BASELINES_DIR, filename);
    const data = await fs.readFile(filepath);
    return { success: true, data };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: false, notFound: true };
    }
    console.error('Load baseline error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save check history
 */
async function saveHistory(websiteId, result) {
  try {
    await initStorage();
    const date = new Date().toISOString().split('T')[0];
    const filename = `${websiteId}_${date}.json`;
    const filepath = path.join(HISTORY_DIR, filename);
    
    let history = [];
    try {
      const existing = await fs.readFile(filepath, 'utf8');
      history = JSON.parse(existing);
    } catch (err) {
      // File doesn't exist yet, start fresh
    }
    
    history.push({
      timestamp: new Date().toISOString(),
      ...result
    });
    
    await fs.writeFile(filepath, JSON.stringify(history, null, 2));
    return { success: true, path: filepath };
  } catch (error) {
    console.error('Save history error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get uptime statistics for a website
 */
async function getUptimeStats(websiteId, days = 7) {
  try {
    await initStorage();
    const stats = {
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      uptimePercentage: 0,
      checks: []
    };
    
    const files = await fs.readdir(HISTORY_DIR);
    const websiteFiles = files.filter(f => f.startsWith(websiteId));
    
    for (const file of websiteFiles) {
      const filepath = path.join(HISTORY_DIR, file);
      const data = await fs.readFile(filepath, 'utf8');
      const history = JSON.parse(data);
      
      stats.checks.push(...history);
    }
    
    stats.totalChecks = stats.checks.length;
    stats.successfulChecks = stats.checks.filter(c => c.isUp).length;
    stats.failedChecks = stats.totalChecks - stats.successfulChecks;
    stats.uptimePercentage = stats.totalChecks > 0
      ? ((stats.successfulChecks / stats.totalChecks) * 100).toFixed(2)
      : 0;
    
    return { success: true, stats };
  } catch (error) {
    console.error('Get stats error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  initStorage,
  saveBaseline,
  loadBaseline,
  saveHistory,
  getUptimeStats
};

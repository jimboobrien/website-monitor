/**
 * Dashboard Service
 * Provides data aggregation and statistics for the dashboard UI
 */

const fs = require('fs').promises;
const path = require('path');

const STORAGE_DIR = '/tmp/website-monitor';
const HISTORY_DIR = path.join(STORAGE_DIR, 'history');

/**
 * Calculate uptime percentage for a time period
 */
function calculateUptime(checks) {
  if (!checks || checks.length === 0) return 100;
  
  const successfulChecks = checks.filter(c => c.status === 'up').length;
  return (successfulChecks / checks.length) * 100;
}

/**
 * Get checks from history for a specific time period
 */
function getChecksForPeriod(allChecks, hours) {
  const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
  return allChecks.filter(check => check.timestamp > cutoffTime);
}

/**
 * Calculate average response time
 */
function calculateAvgResponseTime(checks) {
  if (!checks || checks.length === 0) return 0;
  
  const responseTimes = checks
    .filter(c => c.responseTime)
    .map(c => c.responseTime);
  
  if (responseTimes.length === 0) return 0;
  
  const sum = responseTimes.reduce((a, b) => a + b, 0);
  return Math.round(sum / responseTimes.length);
}

/**
 * Get recent incidents from history
 */
function getRecentIncidents(checks, limit = 10) {
  const incidents = checks
    .filter(c => c.status === 'down' || c.issues?.length > 0)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
  
  return incidents.map(check => ({
    timestamp: check.timestamp,
    websiteId: check.websiteId,
    type: check.status === 'down' ? 'down' : 'issue',
    message: check.error || (check.issues ? check.issues[0]?.message : ''),
    issues: check.issues || []
  }));
}

/**
 * Load history for a specific website
 */
async function loadWebsiteHistory(websiteId) {
  try {
    const historyFile = path.join(HISTORY_DIR, `${websiteId}.json`);
    const exists = await fs.access(historyFile).then(() => true).catch(() => false);
    
    if (!exists) {
      return [];
    }
    
    const data = await fs.readFile(historyFile, 'utf8');
    const history = JSON.parse(data);
    return history.checks || [];
  } catch (error) {
    console.error(`Error loading history for ${websiteId}:`, error);
    return [];
  }
}

/**
 * Get monitor statistics
 */
async function getMonitorStats(websiteId, config) {
  const allChecks = await loadWebsiteHistory(websiteId);
  
  // Get checks for different time periods
  const checks24h = getChecksForPeriod(allChecks, 24);
  const checks7d = getChecksForPeriod(allChecks, 24 * 7);
  const checks30d = getChecksForPeriod(allChecks, 24 * 30);
  
  // Calculate uptime percentages
  const uptime24h = calculateUptime(checks24h);
  const uptime7d = calculateUptime(checks7d);
  const uptime30d = calculateUptime(checks30d);
  const uptimeAll = calculateUptime(allChecks);
  
  // Get current status (last check)
  const lastCheck = allChecks.length > 0 ? allChecks[allChecks.length - 1] : null;
  const currentStatus = lastCheck?.status || 'unknown';
  
  // Calculate average response time
  const avgResponseTime24h = calculateAvgResponseTime(checks24h);
  const avgResponseTime7d = calculateAvgResponseTime(checks7d);
  
  // Get recent incidents
  const recentIncidents = getRecentIncidents(allChecks, 5);
  
  return {
    websiteId,
    name: config.name,
    url: config.url,
    clientId: config.clientId,
    currentStatus,
    lastCheck: lastCheck?.timestamp || null,
    uptime: {
      '24h': uptime24h,
      '7d': uptime7d,
      '30d': uptime30d,
      'all': uptimeAll
    },
    responseTime: {
      current: lastCheck?.responseTime || 0,
      avg24h: avgResponseTime24h,
      avg7d: avgResponseTime7d
    },
    totalChecks: allChecks.length,
    recentIncidents,
    features: {
      visualCheck: !!config.visualCheck?.enabled,
      customChecks: config.customChecks?.length || 0,
      snapshot: !!config.snapshot?.enabled
    }
  };
}

/**
 * Get all monitors with their statistics
 */
async function getAllMonitorStats(config) {
  const { websites } = config;
  
  const stats = await Promise.all(
    websites.map(async (website) => {
      const websiteId = website.id || website.url.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      return await getMonitorStats(websiteId, website);
    })
  );
  
  return stats;
}

/**
 * Get global statistics across all monitors
 */
function getGlobalStats(monitorStats) {
  const totalMonitors = monitorStats.length;
  const monitorsUp = monitorStats.filter(m => m.currentStatus === 'up').length;
  const monitorsDown = monitorStats.filter(m => m.currentStatus === 'down').length;
  const monitorsUnknown = monitorStats.filter(m => m.currentStatus === 'unknown').length;
  
  // Calculate overall uptime (average of all monitors)
  const uptimes24h = monitorStats.map(m => m.uptime['24h']);
  const overallUptime = uptimes24h.length > 0
    ? uptimes24h.reduce((a, b) => a + b, 0) / uptimes24h.length
    : 100;
  
  // Calculate average response time
  const responseTimes = monitorStats
    .map(m => m.responseTime.avg24h)
    .filter(rt => rt > 0);
  const avgResponseTime = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : 0;
  
  // Get all recent incidents
  const allIncidents = monitorStats
    .flatMap(m => m.recentIncidents)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20);
  
  return {
    totalMonitors,
    monitorsUp,
    monitorsDown,
    monitorsUnknown,
    overallUptime: Math.round(overallUptime * 100) / 100,
    avgResponseTime,
    recentIncidents: allIncidents
  };
}

/**
 * Get monitors grouped by client
 */
function getMonitorsByClient(monitorStats, clients) {
  const byClient = {};
  
  monitorStats.forEach(monitor => {
    const clientId = monitor.clientId || 'uncategorized';
    if (!byClient[clientId]) {
      const client = clients?.find(c => c.id === clientId);
      byClient[clientId] = {
        clientId,
        name: client?.name || clientId,
        email: client?.email || '',
        monitors: []
      };
    }
    byClient[clientId].monitors.push(monitor);
  });
  
  return Object.values(byClient);
}

/**
 * Get response time history for charts
 */
async function getResponseTimeHistory(websiteId, hours = 24) {
  const allChecks = await loadWebsiteHistory(websiteId);
  const checks = getChecksForPeriod(allChecks, hours);
  
  return checks
    .filter(c => c.responseTime)
    .map(c => ({
      timestamp: c.timestamp,
      responseTime: c.responseTime,
      status: c.status
    }));
}

/**
 * Get uptime history for bar charts (hourly or daily buckets)
 */
async function getUptimeHistory(websiteId, days = 7) {
  const allChecks = await loadWebsiteHistory(websiteId);
  const checks = getChecksForPeriod(allChecks, days * 24);
  
  // Group by day
  const dayBuckets = {};
  
  checks.forEach(check => {
    const date = new Date(check.timestamp);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!dayBuckets[dayKey]) {
      dayBuckets[dayKey] = {
        date: dayKey,
        total: 0,
        up: 0,
        down: 0
      };
    }
    
    dayBuckets[dayKey].total++;
    if (check.status === 'up') {
      dayBuckets[dayKey].up++;
    } else {
      dayBuckets[dayKey].down++;
    }
  });
  
  // Convert to array and calculate uptime percentage for each day
  return Object.values(dayBuckets).map(day => ({
    date: day.date,
    uptime: (day.up / day.total) * 100,
    checks: day.total
  })).sort((a, b) => a.date.localeCompare(b.date));
}

module.exports = {
  getMonitorStats,
  getAllMonitorStats,
  getGlobalStats,
  getMonitorsByClient,
  getResponseTimeHistory,
  getUptimeHistory
};

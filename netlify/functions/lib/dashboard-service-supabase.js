/**
 * Dashboard Service (Supabase Version)
 * Provides data aggregation and statistics using Supabase database
 */

const {
  getAllWebsites,
  getWebsite,
  getMonitorChecks,
  getLatestCheck,
  getRecentIncidents
} = require('./supabase');

/**
 * Calculate uptime percentage for a time period
 */
function calculateUptime(checks) {
  if (!checks || checks.length === 0) return 0;
  
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
 * Get monitor statistics
 */
async function getMonitorStats(websiteId, { env } = {}) {
  try {
    // Get website config
    const website = await getWebsite(websiteId);

    // Get all checks for the last 30 days (for statistics)
    const allChecks = await getMonitorChecks(websiteId, 24 * 30, 10000, { env });
    
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
    const lastCheck = await getLatestCheck(websiteId, { env });
    const currentStatus = lastCheck?.status || 'unknown';

    // Calculate average response time
    const avgResponseTime24h = calculateAvgResponseTime(checks24h);
    const avgResponseTime7d = calculateAvgResponseTime(checks7d);

    // Get recent incidents
    const recentIncidents = await getRecentIncidents(websiteId, 5, { env });
    
    return {
      websiteId,
      name: website.name,
      url: website.url,
      clientId: website.client_id,
      client: website.clients || null,
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
      ssl: lastCheck?.metadata?.ssl ?? null,
      sslError: lastCheck?.metadata?.sslError || null,
      features: {
        visualCheck: !!website.visual_check_enabled,
        customChecks: (website.custom_checks || []).length,
        snapshot: !!website.snapshot_enabled
      }
    };
  } catch (error) {
    console.error(`Error getting stats for ${websiteId}:`, error);
    
    // Return minimal stats if there's an error
    return {
      websiteId,
      name: websiteId,
      url: '',
      clientId: null,
      client: null,
      currentStatus: 'unknown',
      ssl: null,
      sslError: null,
      lastCheck: null,
      uptime: {
        '24h': 0,
        '7d': 0,
        '30d': 0,
        'all': 0
      },
      responseTime: {
        current: 0,
        avg24h: 0,
        avg7d: 0
      },
      totalChecks: 0,
      recentIncidents: [],
      features: {
        visualCheck: false,
        customChecks: 0,
        snapshot: false
      }
    };
  }
}

/**
 * Get all monitors with their statistics
 */
async function getAllMonitorStats({ env } = {}) {
  try {
    const websites = await getAllWebsites();

    const stats = await Promise.all(
      websites.map(async (website) => {
        return await getMonitorStats(website.id, { env });
      })
    );
    
    return stats;
  } catch (error) {
    console.error('Error getting all monitor stats:', error);
    return [];
  }
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
    : 0;
  
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
async function getMonitorsByClient(monitorStats = null) {
  if (!monitorStats) {
    monitorStats = await getAllMonitorStats();
  }
  
  const byClient = {};
  
  monitorStats.forEach(monitor => {
    const clientId = monitor.clientId || 'uncategorized';
    if (!byClient[clientId]) {
      byClient[clientId] = {
        clientId,
        name: clientId,
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
async function getResponseTimeHistory(websiteId, hours = 24, { env } = {}) {
  try {
    const checks = await getMonitorChecks(websiteId, hours, 1000, { env });
    
    return checks
      .filter(c => c.responseTime)
      .map(c => ({
        timestamp: c.timestamp,
        responseTime: c.responseTime,
        status: c.status
      }))
      .reverse(); // Oldest first for charts
  } catch (error) {
    console.error(`Error getting response time history for ${websiteId}:`, error);
    return [];
  }
}

/**
 * Get uptime history for bar charts (daily buckets)
 */
async function getUptimeHistory(websiteId, days = 7, { env } = {}) {
  try {
    const checks = await getMonitorChecks(websiteId, days * 24, 10000, { env });
    
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
      uptime: day.total > 0 ? (day.up / day.total) * 100 : 0,
      checks: day.total
    })).sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error(`Error getting uptime history for ${websiteId}:`, error);
    return [];
  }
}

module.exports = {
  getMonitorStats,
  getAllMonitorStats,
  getGlobalStats,
  getMonitorsByClient,
  getResponseTimeHistory,
  getUptimeHistory
};

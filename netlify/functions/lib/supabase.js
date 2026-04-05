/**
 * Supabase Client and Service Layer
 * Provides database operations for website monitoring
 */

const { createClient } = require('@supabase/supabase-js');

// Environment identifier — defaults to 'production' on Netlify
function getEnvironment() {
  return process.env.MONITOR_ENV || 'production';
}

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials in environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * WEBSITES (Monitor Configuration)
 */

async function getAllWebsites() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('websites')
    .select('*, clients(*)')
    .eq('enabled', true)
    .order('name');
  
  if (error) throw error;
  return data || [];
}

async function getWebsite(websiteId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('websites')
    .select('*, clients(*)')
    .eq('id', websiteId)
    .single();
  
  if (error) throw error;
  return data;
}

async function createWebsite(website) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('websites')
    .insert([website])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

async function updateWebsite(websiteId, updates) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('websites')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', websiteId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

async function deleteMonitorCheck(checkId) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('monitor_checks')
    .delete()
    .eq('id', checkId);

  if (error) throw error;
}

async function deleteIncident(incidentId) {
  const supabase = getSupabaseClient();

  // Get the incident details first so we can delete associated failed checks
  const { data: incident, error: fetchError } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', incidentId)
    .single();

  if (fetchError) throw fetchError;

  // Delete failed monitor checks during the incident window
  const startTime = incident.started_at;
  const endTime = incident.resolved_at || new Date().toISOString();

  await supabase
    .from('monitor_checks')
    .delete()
    .eq('website_id', incident.website_id)
    .gte('timestamp', startTime)
    .lte('timestamp', endTime)
    .neq('status', 'up');

  // Delete the incident itself
  const { error } = await supabase
    .from('incidents')
    .delete()
    .eq('id', incidentId);

  if (error) throw error;
}

async function deleteAllIncidents(websiteId) {
  const supabase = getSupabaseClient();

  // Delete all failed checks for this website
  await supabase
    .from('monitor_checks')
    .delete()
    .eq('website_id', websiteId)
    .neq('status', 'up');

  // Delete all incidents
  const { error } = await supabase
    .from('incidents')
    .delete()
    .eq('website_id', websiteId);

  if (error) throw error;
}

async function deleteEnvironmentData(env) {
  const supabase = getSupabaseClient();

  const { count: checksDeleted } = await supabase
    .from('monitor_checks')
    .delete({ count: 'exact' })
    .eq('environment', env);

  const { count: incidentsDeleted } = await supabase
    .from('incidents')
    .delete({ count: 'exact' })
    .eq('environment', env);

  return { checksDeleted: checksDeleted || 0, incidentsDeleted: incidentsDeleted || 0 };
}

async function deleteWebsite(websiteId) {
  const supabase = getSupabaseClient();

  // Delete related data first (foreign key constraints)
  await supabase.from('monitor_checks').delete().eq('website_id', websiteId);
  await supabase.from('incidents').delete().eq('website_id', websiteId);
  await supabase.from('alert_history').delete().eq('website_id', websiteId);
  await supabase.from('visual_baselines').delete().eq('website_id', websiteId);

  const { error } = await supabase
    .from('websites')
    .delete()
    .eq('id', websiteId);

  if (error) throw error;
}

/**
 * CLIENTS
 */

async function getAllClients() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data || [];
}

async function getClient(clientId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();
  
  if (error) throw error;
  return data;
}

async function createClientRecord(client) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('clients')
    .insert([client])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateClient(clientId, updates) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('clients')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', clientId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * MONITOR CHECKS (Time-series data)
 */

async function saveMonitorCheck(check) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('monitor_checks')
    .insert([{
      website_id: check.websiteId,
      timestamp: check.timestamp ? new Date(check.timestamp).toISOString() : new Date().toISOString(),
      status: check.status,
      response_time: check.responseTime,
      status_code: check.statusCode,
      error_message: check.error,
      issues: check.issues || [],
      metadata: check.metadata || {},
      environment: getEnvironment()
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

async function getMonitorChecks(websiteId, hours = 24, limit = 1000, { env } = {}) {
  const supabase = getSupabaseClient();
  const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('monitor_checks')
    .select('*')
    .eq('website_id', websiteId)
    .gte('timestamp', cutoffTime)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (env) {
    query = query.eq('environment', env);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  
  // Convert to legacy format for compatibility
  return (data || []).map(check => ({
    id: check.id,
    websiteId: check.website_id,
    timestamp: new Date(check.timestamp).getTime(),
    status: check.status,
    responseTime: check.response_time,
    statusCode: check.status_code,
    error: check.error_message,
    issues: check.issues || [],
    environment: check.environment
  }));
}

async function getLatestCheck(websiteId, { env } = {}) {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('monitor_checks')
    .select('*')
    .eq('website_id', websiteId)
    .order('timestamp', { ascending: false })
    .limit(1);

  if (env) {
    query = query.eq('environment', env);
  }

  const { data, error } = await query.single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // No rows found
    throw error;
  }
  
  return {
    websiteId: data.website_id,
    timestamp: new Date(data.timestamp).getTime(),
    status: data.status,
    responseTime: data.response_time,
    statusCode: data.status_code,
    error: data.error_message,
    issues: data.issues || [],
    metadata: data.metadata || {}
  };
}

async function getAllLatestChecks() {
  const supabase = getSupabaseClient();
  
  // Get all websites
  const websites = await getAllWebsites();
  
  // Get latest check for each
  const latestChecks = await Promise.all(
    websites.map(async (website) => {
      const check = await getLatestCheck(website.id);
      return {
        websiteId: website.id,
        check
      };
    })
  );
  
  return latestChecks.reduce((acc, { websiteId, check }) => {
    acc[websiteId] = check;
    return acc;
  }, {});
}

/**
 * INCIDENTS
 */

async function createIncident(incident) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('incidents')
    .insert([{
      website_id: incident.websiteId,
      started_at: incident.startedAt ? new Date(incident.startedAt).toISOString() : new Date().toISOString(),
      resolved_at: incident.resolvedAt ? new Date(incident.resolvedAt).toISOString() : null,
      incident_type: incident.type,
      severity: incident.severity,
      message: incident.message,
      metadata: incident.metadata || {},
      environment: getEnvironment()
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

async function resolveIncident(incidentId, resolvedAt = null) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('incidents')
    .update({ resolved_at: resolvedAt || new Date().toISOString() })
    .eq('id', incidentId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

async function getActiveIncidents(websiteId = null) {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('incidents')
    .select('*')
    .is('resolved_at', null);
  
  if (websiteId) {
    query = query.eq('website_id', websiteId);
  }
  
  const { data, error } = await query.order('started_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

async function getRecentIncidents(websiteId = null, limit = 10, { env } = {}) {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('incidents')
    .select('*');

  if (websiteId) {
    query = query.eq('website_id', websiteId);
  }

  if (env) {
    query = query.eq('environment', env);
  }

  const { data, error } = await query
    .order('started_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  
  return (data || []).map(incident => ({
    id: incident.id,
    timestamp: new Date(incident.started_at).getTime(),
    websiteId: incident.website_id,
    type: incident.incident_type,
    message: incident.message,
    resolvedAt: incident.resolved_at ? new Date(incident.resolved_at).getTime() : null
  }));
}

/**
 * ALERT HISTORY
 */

async function saveAlertHistory(alert) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('alert_history')
    .insert([{
      website_id: alert.websiteId,
      alert_type: alert.type,
      recipient: alert.recipient,
      subject: alert.subject,
      success: alert.success,
      error_message: alert.error
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

async function getAlertHistory(websiteId, limit = 50) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('alert_history')
    .select('*')
    .eq('website_id', websiteId)
    .order('sent_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}

/**
 * VISUAL BASELINES
 */

async function saveVisualBaseline(websiteId, storagePath) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('visual_baselines')
    .upsert([{
      website_id: websiteId,
      storage_path: storagePath,
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

async function getVisualBaseline(websiteId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('visual_baselines')
    .select('*')
    .eq('website_id', websiteId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // No baseline exists
    throw error;
  }
  
  return data;
}

/**
 * STORAGE (Screenshots and Baselines)
 */

async function uploadScreenshot(websiteId, buffer, filename) {
  const supabase = getSupabaseClient();
  const path = `${websiteId}/${filename}`;
  
  const { data, error } = await supabase.storage
    .from('screenshots')
    .upload(path, buffer, {
      contentType: 'image/png',
      upsert: true
    });
  
  if (error) throw error;
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('screenshots')
    .getPublicUrl(path);
  
  return {
    path,
    publicUrl: urlData.publicUrl
  };
}

async function uploadBaseline(websiteId, buffer, filename = 'baseline.png') {
  const supabase = getSupabaseClient();
  const path = `${websiteId}/${filename}`;
  
  const { data, error } = await supabase.storage
    .from('baselines')
    .upload(path, buffer, {
      contentType: 'image/png',
      upsert: true
    });
  
  if (error) throw error;
  
  // Save metadata to database
  await saveVisualBaseline(websiteId, path);
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('baselines')
    .getPublicUrl(path);
  
  return {
    path,
    publicUrl: urlData.publicUrl
  };
}

async function listScreenshots(websiteId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from('screenshots')
    .list(websiteId, { sortBy: { column: 'created_at', order: 'desc' }, limit: 50 });

  if (error) throw error;

  return (data || [])
    .filter(f => f.name.endsWith('.png'))
    .map(f => {
      const { data: urlData } = supabase.storage
        .from('screenshots')
        .getPublicUrl(`${websiteId}/${f.name}`);
      return {
        name: f.name,
        url: urlData.publicUrl,
        createdAt: f.created_at,
        size: f.metadata?.size || 0
      };
    });
}

async function getBaselineUrl(websiteId) {
  const baseline = await getVisualBaseline(websiteId);
  if (!baseline) return null;
  
  const supabase = getSupabaseClient();
  const { data } = supabase.storage
    .from('baselines')
    .getPublicUrl(baseline.storage_path);
  
  return data.publicUrl;
}

module.exports = {
  // Client
  getSupabaseClient,
  
  // Websites
  getAllWebsites,
  getWebsite,
  createWebsite,
  updateWebsite,
  deleteMonitorCheck,
  deleteIncident,
  deleteAllIncidents,
  deleteWebsite,
  deleteEnvironmentData,
  getEnvironment,
  
  // Clients
  getAllClients,
  getClient,
  createClientRecord,
  updateClient,
  
  // Monitor Checks
  saveMonitorCheck,
  getMonitorChecks,
  getLatestCheck,
  getAllLatestChecks,
  
  // Incidents
  createIncident,
  resolveIncident,
  getActiveIncidents,
  getRecentIncidents,
  
  // Alerts
  saveAlertHistory,
  getAlertHistory,
  
  // Visual Baselines
  saveVisualBaseline,
  getVisualBaseline,
  
  // Storage
  uploadScreenshot,
  uploadBaseline,
  listScreenshots,
  getBaselineUrl
};

const { useState, useEffect, useCallback, useMemo } = React;
const { formatDistanceToNow, format } = dateFns;
const { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = Recharts;

// API Base URLs
const API_BASE = '/.netlify/functions/dashboard-data';
const CHECK_NOW_BASE = '/.netlify/functions/check-now';
const MONITOR_URL = '/.netlify/functions/monitor';
const MONITOR_ENHANCED_URL = '/.netlify/functions/monitor-enhanced';
const SNAPSHOT_URL = '/.netlify/functions/snapshot';
const CLIENTS_URL = '/.netlify/functions/clients';
const MONITORS_URL = '/.netlify/functions/monitors';

// Utility: Fetch dashboard data
async function fetchDashboardData(action, params = {}) {
  const queryString = new URLSearchParams({ action, ...params }).toString();
  const response = await fetch(`${API_BASE}?${queryString}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  const json = await response.json();
  return json.data;
}

// Utility: Trigger a check
async function triggerCheck(websiteId = null) {
  const params = websiteId ? `?id=${websiteId}` : '?all=true';
  const response = await fetch(`${CHECK_NOW_BASE}${params}`, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Check failed: ${response.status}`);
  }
  return await response.json();
}

// Environment helpers
async function fetchEnvironment() {
  const response = await fetch(MONITORS_URL);
  if (!response.ok) return 'production';
  const json = await response.json();
  return json.environment;
}

async function clearEnvironmentData(env) {
  const response = await fetch(`${MONITORS_URL}?action=delete-environment&env=${env}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Clear failed: ${response.status}`);
  return await response.json();
}

// Delete helpers
async function deleteIncidentApi(incidentId) {
  const response = await fetch(`${MONITORS_URL}?action=delete-incident&incidentId=${incidentId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
  return await response.json();
}

async function deleteAllIncidentsApi(websiteId) {
  const response = await fetch(`${MONITORS_URL}?action=delete-all-incidents&websiteId=${websiteId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
  return await response.json();
}

async function deleteWebsiteApi(websiteId) {
  const response = await fetch(`${MONITORS_URL}?action=delete-website&websiteId=${websiteId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
  return await response.json();
}

async function deleteCheckApi(checkId) {
  const response = await fetch(`${MONITORS_URL}?action=delete-check&checkId=${checkId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
  return await response.json();
}

// Client API helpers
async function fetchClients() {
  const response = await fetch(CLIENTS_URL);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const json = await response.json();
  return json.data;
}

async function updateClientApi(clientId, updates) {
  const response = await fetch(`${CLIENTS_URL}?id=${clientId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const json = await response.json();
  return json.data;
}

// Color Picker Component
function ColorPicker({ value, onChange }) {
  const presets = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308',
    '#84CC16', '#22C55E', '#10B981', '#14B8A6',
    '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
    '#F43F5E', '#6B7280', '#78716C', '#1E293B'
  ];

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {presets.map(color => (
        <button
          key={color}
          onClick={() => onChange(color)}
          className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
          style={{
            backgroundColor: color,
            borderColor: value === color ? '#1E293B' : 'transparent',
            transform: value === color ? 'scale(1.15)' : undefined
          }}
          title={color}
        />
      ))}
      <input
        type="color"
        value={value || '#6B7280'}
        onChange={(e) => onChange(e.target.value)}
        className="w-7 h-7 rounded cursor-pointer border-0 p-0"
        title="Custom color"
      />
    </div>
  );
}

// Client Badge Component
function ClientBadge({ client }) {
  if (!client) return null;
  const color = client.color || '#6B7280';
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {client.name}
    </span>
  );
}

// Clients Management View
function ClientsView() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    fetchClients().then(setClients).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleColorChange = async (clientId, color) => {
    setSaving(clientId);
    try {
      const updated = await updateClientApi(clientId, { color });
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, color: updated.color } : c));
    } catch (err) {
      console.error('Failed to update client color:', err);
      alert('Failed to save color: ' + err.message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Client Colors</h2>
        <div className="space-y-6">
          {clients.map(client => (
            <div key={client.id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: client.color || '#6B7280' }}
                ></span>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900">{client.name}</h3>
                  <p className="text-xs text-gray-500">{client.id}{client.email ? ` \u2022 ${client.email}` : ''}</p>
                </div>
                {saving === client.id && (
                  <span className="text-xs text-blue-600">Saving...</span>
                )}
              </div>
              <ColorPicker
                value={client.color || '#6B7280'}
                onChange={(color) => handleColorChange(client.id, color)}
              />
            </div>
          ))}
          {clients.length === 0 && (
            <p className="text-sm text-gray-500">No clients found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// SSL Badge Component
function SslBadge({ ssl, sslError }) {
  if (ssl === true) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800" title="HTTPS active">
        HTTPS
      </span>
    );
  }
  if (ssl === false && sslError) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800" title={`SSL failed: ${sslError}`}>
        HTTP only
      </span>
    );
  }
  if (ssl === false) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
        HTTP
      </span>
    );
  }
  return null;
}

// Status Badge Component
function StatusBadge({ status }) {
  const colors = {
    up: 'bg-green-100 text-green-800',
    down: 'bg-red-100 text-red-800',
    unknown: 'bg-gray-100 text-gray-800'
  };
  
  const labels = {
    up: 'Up',
    down: 'Down',
    unknown: 'Unknown'
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors.unknown}`}>
      <span className={`status-dot status-${status}`}></span>
      {labels[status] || labels.unknown}
    </span>
  );
}

// Stat Card Component
function StatCard({ title, value, subtitle, icon, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    gray: 'bg-gray-500',
    purple: 'bg-purple-500'
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={`${colorClasses[color]} rounded-full p-3 text-white`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// Response Time Chart Component
function ResponseTimeChart({ monitorId, env }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(24);
  
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const params = { id: monitorId, hours: timeRange };
        if (env) params.env = env;
        const history = await fetchDashboardData('response-time', params);
        
        // Format data for Recharts
        const formattedData = history.map(item => ({
          time: format(new Date(item.timestamp), 'HH:mm'),
          responseTime: item.responseTime,
          status: item.status
        }));
        
        setData(formattedData);
      } catch (error) {
        console.error('Error loading response time data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [monitorId, timeRange]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }
  
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No response time data available
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Response Time</h3>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(Number(e.target.value))}
          className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={6}>Last 6 hours</option>
          <option value={12}>Last 12 hours</option>
          <option value={24}>Last 24 hours</option>
          <option value={48}>Last 48 hours</option>
        </select>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 12 }}
            interval={Math.floor(data.length / 10)}
          />
          <YAxis 
            label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
            formatter={(value) => [`${value}ms`, 'Response Time']}
          />
          <Line 
            type="monotone" 
            dataKey="responseTime" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={false}
            name="Response Time"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Uptime Chart Component
function UptimeChart({ monitorId, env }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(7);
  
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const params = { id: monitorId, days: timeRange };
        if (env) params.env = env;
        const history = await fetchDashboardData('uptime-history', params);
        
        // Format data for Recharts
        const formattedData = history.map(item => ({
          date: format(new Date(item.date), 'MMM dd'),
          uptime: item.uptime,
          checks: item.checks
        }));
        
        setData(formattedData);
      } catch (error) {
        console.error('Error loading uptime data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [monitorId, timeRange]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }
  
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No uptime data available
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Daily Uptime</h3>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(Number(e.target.value))}
          className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            domain={[0, 100]}
            label={{ value: 'Uptime %', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
            formatter={(value, name, props) => {
              if (name === 'uptime') {
                return [`${value.toFixed(2)}%`, 'Uptime'];
              }
              return [value, name];
            }}
          />
          <Bar 
            dataKey="uptime" 
            fill="#10b981"
            name="Uptime"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Check History List Component
function CheckHistoryList({ monitorId, envFilter, onRefresh }) {
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);

  const loadChecks = async () => {
    try {
      setLoading(true);
      const params = { id: monitorId, hours };
      if (envFilter && envFilter !== 'all') params.env = envFilter;
      const data = await fetchDashboardData('checks', params);
      setChecks(data);
    } catch (err) {
      console.error('Error loading checks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChecks();
  }, [monitorId, hours, envFilter]);

  const handleDeleteCheck = async (checkId) => {
    setChecks(prev => prev.filter(c => c.id !== checkId));
    try {
      await deleteCheckApi(checkId);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error deleting check:', err);
      loadChecks();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Check History ({checks.length})
        </h3>
        <select
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={6}>Last 6 hours</option>
          <option value={12}>Last 12 hours</option>
          <option value={24}>Last 24 hours</option>
          <option value={48}>Last 48 hours</option>
          <option value={168}>Last 7 days</option>
        </select>
      </div>

      {checks.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No checks in this time range</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase">
                <th className="pb-2 pr-4">Time</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Response</th>
                <th className="pb-2 pr-4">Code</th>
                <th className="pb-2 pr-4">Error</th>
                <th className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check) => (
                <tr key={check.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">
                    {format(new Date(check.timestamp), 'MMM dd HH:mm:ss')}
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      check.status === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {check.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-gray-700">{check.responseTime}ms</td>
                  <td className="py-2 pr-4 text-gray-500">{check.statusCode || '—'}</td>
                  <td className="py-2 pr-4 text-red-500 text-xs max-w-xs truncate">{check.error || ''}</td>
                  <td className="py-2">
                    <button
                      onClick={() => handleDeleteCheck(check.id)}
                      className="text-gray-400 hover:text-red-500 transition"
                      title="Delete check"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Screenshot Gallery Component
function ScreenshotGallery({ monitorId, showToast }) {
  const [data, setData] = useState({ screenshots: [], baselineUrl: null });
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const loadScreenshots = () => {
    return fetchDashboardData('screenshots', { id: monitorId })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadScreenshots();
  }, [monitorId]);

  const handleCapture = async () => {
    try {
      setCapturing(true);
      const response = await fetch(`${SNAPSHOT_URL}?action=capture&websiteId=${monitorId}`, { method: 'POST' });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || err.detail || `HTTP ${response.status}`);
      }
      const result = await response.json();
      if (showToast) showToast(`Screenshot captured for ${result.name}`, 'success');
      await loadScreenshots();
    } catch (err) {
      console.error('Snapshot capture error:', err);
      if (showToast) showToast('Snapshot failed: ' + err.message, 'error');
    } finally {
      setCapturing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white text-2xl hover:opacity-70"
            >
              \u00d7
            </button>
            <img
              src={selectedImage}
              className="max-w-full max-h-[85vh] rounded shadow-2xl"
              alt="Screenshot"
            />
          </div>
        </div>
      )}

      {/* Capture button */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">
          {data.screenshots.length > 0
            ? `${data.screenshots.length} screenshot(s)`
            : 'No screenshots yet'}
        </span>
        <button
          onClick={handleCapture}
          disabled={capturing}
          className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
        >
          {capturing ? 'Capturing...' : 'Take Snapshot'}
        </button>
      </div>

      {/* Baseline */}
      {data.baselineUrl && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Baseline</h4>
          <img
            src={data.baselineUrl}
            className="w-48 h-auto rounded border border-gray-200 cursor-pointer hover:shadow-md transition"
            onClick={() => setSelectedImage(data.baselineUrl)}
            alt="Baseline screenshot"
          />
        </div>
      )}

      {/* Recent Screenshots */}
      {data.screenshots.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Screenshots</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {data.screenshots.map((shot) => (
              <div key={shot.name} className="group relative">
                <img
                  src={shot.url}
                  className="w-full h-auto rounded border border-gray-200 cursor-pointer hover:shadow-md transition"
                  onClick={() => setSelectedImage(shot.url)}
                  alt={shot.name}
                  loading="lazy"
                />
                <div className="text-xs text-gray-500 mt-1 truncate">
                  {shot.createdAt ? format(new Date(shot.createdAt), 'MMM dd HH:mm') : shot.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Monitor Detail Component
function MonitorDetail({ monitor, onBack, onCheckNow, checking, onDeleteIncident, onDeleteAllIncidents, onDeleteWebsite, envFilter, onRefresh, showToast }) {
  const uptimeColor = monitor.uptime['24h'] >= 99 ? 'text-green-600' : 
                      monitor.uptime['24h'] >= 95 ? 'text-yellow-600' : 
                      'text-red-600';
  
  const lastCheckText = monitor.lastCheck 
    ? formatDistanceToNow(new Date(monitor.lastCheck), { addSuffix: true })
    : 'Never';
  
  return (
    <div>
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            ← Back
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{monitor.name}</h2>
            <a 
              href={monitor.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              {monitor.url} ↗
            </a>
          </div>
          <StatusBadge status={monitor.currentStatus} />
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>Last checked: {lastCheckText}</span>
          <span>•</span>
          {monitor.client ? <ClientBadge client={monitor.client} /> : <span>Uncategorized</span>}
          {monitor.features.visualCheck && (
            <>
              <span>•</span>
              <span className="text-purple-600">📸 Visual Monitoring</span>
            </>
          )}
          {monitor.features.customChecks > 0 && (
            <>
              <span>•</span>
              <span className="text-blue-600">✓ {monitor.features.customChecks} Custom Checks</span>
            </>
          )}
          {monitor.ssl !== null && (
            <>
              <span>•</span>
              <SslBadge ssl={monitor.ssl} sslError={monitor.sslError} />
            </>
          )}
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Uptime (24h)"
          value={`${monitor.uptime['24h'].toFixed(2)}%`}
          subtitle={`${monitor.totalChecks} total checks`}
          color={monitor.uptime['24h'] >= 99 ? 'green' : monitor.uptime['24h'] >= 95 ? 'gray' : 'red'}
        />
        
        <StatCard
          title="Uptime (7d)"
          value={`${monitor.uptime['7d'].toFixed(2)}%`}
          subtitle="Last 7 days"
          color="blue"
        />
        
        <StatCard
          title="Uptime (30d)"
          value={`${monitor.uptime['30d'].toFixed(2)}%`}
          subtitle="Last 30 days"
          color="blue"
        />
        
        <StatCard
          title="Avg Response"
          value={`${monitor.responseTime.avg24h}ms`}
          subtitle={`Current: ${monitor.responseTime.current}ms`}
          color="purple"
        />
      </div>
      
      {/* Charts — key forces remount/refetch when monitor data changes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <ResponseTimeChart key={`rt-${monitor.websiteId}-${monitor.totalChecks}`} monitorId={monitor.websiteId} env={envFilter !== 'all' ? envFilter : undefined} />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <UptimeChart key={`ut-${monitor.websiteId}-${monitor.totalChecks}`} monitorId={monitor.websiteId} env={envFilter !== 'all' ? envFilter : undefined} />
        </div>
      </div>
      
      {/* Screenshots */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Screenshots</h3>
        <ScreenshotGallery key={`ss-${monitor.websiteId}-${monitor.totalChecks}`} monitorId={monitor.websiteId} showToast={showToast} />
      </div>

      {/* Check History */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <CheckHistoryList
          key={`checks-${monitor.websiteId}-${monitor.totalChecks}`}
          monitorId={monitor.websiteId}
          envFilter={envFilter !== 'all' ? envFilter : undefined}
          onRefresh={onRefresh}
        />
      </div>

      {/* Recent Incidents */}
      {monitor.recentIncidents.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Incidents ({monitor.recentIncidents.length})
            </h3>
            <button
              onClick={() => {
                if (confirm(`Clear all ${monitor.recentIncidents.length} incident(s) for ${monitor.name}?`)) {
                  onDeleteAllIncidents(monitor.websiteId);
                }
              }}
              className="px-3 py-1.5 text-xs border border-red-400 text-red-600 rounded-lg hover:bg-red-50 transition"
            >
              Clear All
            </button>
          </div>
          <div className="space-y-3">
            {monitor.recentIncidents.map((incident, idx) => (
              <div key={incident.id || idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  incident.type === 'down' ? 'bg-red-500' : 'bg-yellow-500'
                }`}></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {incident.type === 'down' ? 'Monitor Down' : 'Issues Detected'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {format(new Date(incident.timestamp), 'MMM dd, yyyy HH:mm')}
                      </span>
                      {incident.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteIncident(incident.id);
                          }}
                          className="text-gray-400 hover:text-red-500 transition"
                          title="Delete incident"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{incident.message}</p>
                  {incident.resolvedAt && (
                    <p className="text-xs text-green-600 mt-1">
                      Resolved {formatDistanceToNow(new Date(incident.resolvedAt), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Monitor Info & Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Monitor Info</h3>
          <button
            onClick={() => onCheckNow(monitor.websiteId)}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            disabled={checking}
          >
            {checking ? 'Checking...' : 'Check Now'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <span className="text-gray-500">Website ID:</span>
            <code className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">{monitor.websiteId}</code>
          </div>
          <div className="flex items-center">
            <span className="text-gray-500">Client:</span>
            <span className="ml-2">{monitor.client ? <ClientBadge client={monitor.client} /> : <span className="text-gray-900">Uncategorized</span>}</span>
          </div>
          <div>
            <span className="text-gray-500">Total Checks:</span>
            <span className="ml-2 text-gray-900">{monitor.totalChecks}</span>
          </div>
          <div>
            <span className="text-gray-500">All-time Uptime:</span>
            <span className="ml-2 text-gray-900">{monitor.uptime['all'].toFixed(2)}%</span>
          </div>
          <div>
            <span className="text-gray-500">Current Response:</span>
            <span className="ml-2 text-gray-900">{monitor.responseTime.current}ms</span>
          </div>
          <div>
            <span className="text-gray-500">7d Avg Response:</span>
            <span className="ml-2 text-gray-900">{monitor.responseTime.avg7d}ms</span>
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={() => {
              if (confirm(`Delete ${monitor.name}?\n\nThis permanently removes the monitor and ALL its data (checks, incidents, alerts, baselines).`)) {
                onDeleteWebsite(monitor.websiteId, monitor.name);
              }
            }}
            className="px-4 py-2 text-sm border border-red-500 text-red-600 rounded-lg hover:bg-red-50 transition"
          >
            Delete Monitor
          </button>
        </div>
      </div>
    </div>
  );
}

// Monitor Card Component
function MonitorCard({ monitor, onClick }) {
  const uptimeColor = monitor.uptime['24h'] >= 99 ? 'text-green-600' : 
                      monitor.uptime['24h'] >= 95 ? 'text-yellow-600' : 
                      'text-red-600';
  
  const lastCheckText = monitor.lastCheck 
    ? formatDistanceToNow(new Date(monitor.lastCheck), { addSuffix: true })
    : 'Never';
  
  const clientColor = monitor.client?.color || '#6B7280';

  return (
    <div
      className="monitor-card bg-white rounded-lg shadow cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      <div className="h-1.5" style={{ backgroundColor: clientColor }}></div>
      <div className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {monitor.name}
          </h3>
          <p className="text-sm text-gray-500 truncate">{monitor.url}</p>
        </div>
        <StatusBadge status={monitor.currentStatus} />
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500">Uptime (24h)</p>
          <p className={`text-2xl font-bold ${uptimeColor}`}>
            {monitor.uptime['24h'].toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Avg Response</p>
          <p className="text-2xl font-bold text-gray-900">
            {monitor.responseTime.avg24h}ms
          </p>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Last checked: {lastCheckText}</span>
        <div className="flex items-center gap-2">
          {monitor.client && <ClientBadge client={monitor.client} />}
          <SslBadge ssl={monitor.ssl} sslError={monitor.sslError} />
          {monitor.features.visualCheck && (
            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
              Visual
            </span>
          )}
        </div>
      </div>

      {monitor.recentIncidents.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-red-600 font-medium">
            {monitor.recentIncidents.length} recent incident{monitor.recentIncidents.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
      </div>
    </div>
  );
}

// Monitor List Component
function MonitorList({ monitors, onSelectMonitor }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('all');
  const [sortBy, setSortBy] = useState('status');
  
  // Get unique clients with their data
  const clientMap = {};
  monitors.forEach(m => {
    if (m.clientId && m.client && !clientMap[m.clientId]) {
      clientMap[m.clientId] = m.client;
    }
  });
  const clients = Object.keys(clientMap);
  
  // Filter and sort monitors
  const filteredMonitors = monitors
    .filter(m => {
      const term = searchTerm.toLowerCase();
      const clientName = (m.client?.name || m.clientId || '').toLowerCase();
      const matchesSearch = m.name.toLowerCase().includes(term) ||
                          m.url.toLowerCase().includes(term) ||
                          clientName.includes(term);
      const matchesClient = filterClient === 'all' || m.clientId === filterClient;
      return matchesSearch && matchesClient;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'status':
          // down < unknown < up
          const statusOrder = { down: 0, unknown: 1, up: 2 };
          return (statusOrder[a.currentStatus] || 1) - (statusOrder[b.currentStatus] || 1);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'uptime':
          return a.uptime['24h'] - b.uptime['24h'];
        case 'response':
          return b.responseTime.avg24h - a.responseTime.avg24h;
        case 'client':
          const aClient = (a.client?.name || a.clientId || 'zzz').toLowerCase();
          const bClient = (b.client?.name || b.clientId || 'zzz').toLowerCase();
          return aClient.localeCompare(bClient);
        default:
          return 0;
      }
    });
  
  return (
    <div>
      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search by name, URL, or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Clients</option>
            {clients.map(id => (
              <option key={id} value={id}>{clientMap[id]?.name || id}</option>
            ))}
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="status">Sort by Status</option>
            <option value="name">Sort by Name</option>
            <option value="uptime">Sort by Uptime</option>
            <option value="response">Sort by Response Time</option>
            <option value="client">Sort by Client</option>
          </select>
        </div>
      </div>
      
      {/* Monitor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMonitors.map(monitor => (
          <MonitorCard
            key={monitor.websiteId}
            monitor={monitor}
            onClick={() => onSelectMonitor(monitor)}
          />
        ))}
      </div>
      
      {filteredMonitors.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No monitors found</p>
        </div>
      )}
    </div>
  );
}

// Dashboard Overview Component
function DashboardOverview({ globalStats, monitors }) {
  const uptimeColor = globalStats.overallUptime >= 99 ? 'text-green-600' : 
                      globalStats.overallUptime >= 95 ? 'text-yellow-600' : 
                      'text-red-600';
  
  return (
    <div>
      {/* Global Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Monitors"
          value={globalStats.totalMonitors}
          subtitle={`${monitors.length} active`}
          color="blue"
        />
        
        <StatCard
          title="Up"
          value={globalStats.monitorsUp}
          subtitle={globalStats.totalMonitors > 0 ? `${((globalStats.monitorsUp / globalStats.totalMonitors) * 100).toFixed(1)}%` : 'No monitors'}
          color="green"
        />
        
        <StatCard
          title="Down"
          value={globalStats.monitorsDown}
          subtitle={globalStats.monitorsDown > 0 ? 'Needs attention!' : 'All good'}
          color={globalStats.monitorsDown > 0 ? 'red' : 'gray'}
        />
        
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Overall Uptime (24h)</p>
          <p className={`mt-2 text-3xl font-bold ${uptimeColor}`}>
            {globalStats.overallUptime.toFixed(2)}%
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Avg response: {globalStats.avgResponseTime}ms
          </p>
        </div>
      </div>
      
      {/* Recent Incidents */}
      {globalStats.recentIncidents.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Incidents
          </h2>
          <div className="space-y-3">
            {globalStats.recentIncidents.slice(0, 10).map((incident, idx) => {
              const monitor = monitors.find(m => m.websiteId === incident.websiteId);
              return (
                <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    incident.type === 'down' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {monitor?.name || incident.websiteId}
                    </p>
                    <p className="text-sm text-gray-600">{incident.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(incident.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Endpoint URL display helper
function EndpointRow({ label, url, description }) {
  const fullUrl = `${window.location.origin}${url}`;
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-2 p-4 bg-gray-50 rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <code className="text-xs bg-white border border-gray-200 rounded px-3 py-1.5 text-gray-700 truncate max-w-md block">
          {fullUrl}
        </code>
        <button
          onClick={() => { navigator.clipboard.writeText(fullUrl); }}
          className="px-2 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition flex-shrink-0"
          title="Copy URL"
        >
          Copy
        </button>
      </div>
    </div>
  );
}

// API Endpoints View
function EndpointsView() {
  return (
    <div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">API Endpoints</h2>
        <p className="text-sm text-gray-500 mb-6">
          Use these URLs to trigger checks, view data, or integrate with external services.
        </p>

        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Monitoring</h3>
        <div className="space-y-3 mb-6">
          <EndpointRow
            label="Basic Monitor"
            url={MONITOR_URL}
            description="Run basic HTTP checks on all sites and send alerts"
          />
          <EndpointRow
            label="Enhanced Monitor"
            url={MONITOR_ENHANCED_URL}
            description="Run checks with visual comparison and custom element checks (scheduled every 15 min)"
          />
          <EndpointRow
            label="Check All Sites Now"
            url={`${CHECK_NOW_BASE}?all=true`}
            description="On-demand check of all sites — saves results to database"
          />
          <EndpointRow
            label="Check Single Site"
            url={`${CHECK_NOW_BASE}?id=WEBSITE_ID`}
            description="On-demand check of a single site by its ID"
          />
        </div>

        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Snapshots</h3>
        <div className="space-y-3 mb-6">
          <EndpointRow
            label="Capture Snapshot"
            url={`${SNAPSHOT_URL}?action=capture&websiteId=WEBSITE_ID`}
            description="Capture a new snapshot (screenshot + HTML) of a website"
          />
          <EndpointRow
            label="List Snapshots"
            url={`${SNAPSHOT_URL}?action=list&websiteId=WEBSITE_ID`}
            description="List all snapshots for a website"
          />
          <EndpointRow
            label="Snapshot Viewer"
            url="/.netlify/functions/snapshot-viewer"
            description="HTML UI for browsing all captured snapshots"
          />
        </div>

        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Dashboard Data</h3>
        <div className="space-y-3">
          <EndpointRow
            label="Overview"
            url={`${API_BASE}?action=overview`}
            description="Global statistics and recent incidents"
          />
          <EndpointRow
            label="All Monitors"
            url={`${API_BASE}?action=monitors`}
            description="All monitors with current stats"
          />
          <EndpointRow
            label="Single Monitor"
            url={`${API_BASE}?action=monitor&id=WEBSITE_ID`}
            description="Detailed stats for a specific monitor"
          />
          <EndpointRow
            label="Response Time History"
            url={`${API_BASE}?action=response-time&id=WEBSITE_ID&hours=24`}
            description="Response time data points for charts"
          />
          <EndpointRow
            label="Uptime History"
            url={`${API_BASE}?action=uptime-history&id=WEBSITE_ID&days=7`}
            description="Daily uptime percentages for bar charts"
          />
        </div>
      </div>
    </div>
  );
}

// Main App Component
function App() {
  // Hash-based routing
  const parseHash = () => {
    const hash = window.location.hash || '#/';
    if (hash.startsWith('#/monitor/')) {
      return { view: 'detail', monitorId: hash.replace('#/monitor/', '') };
    }
    const routes = { '#/': 'overview', '#/monitors': 'monitors', '#/clients': 'clients', '#/endpoints': 'endpoints' };
    return { view: routes[hash] || 'overview', monitorId: null };
  };

  const navigate = (path) => {
    window.location.hash = path;
  };

  const [{ view, monitorId: routeMonitorId }, setRoute] = useState(parseHash);
  const [selectedMonitor, setSelectedMonitor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [globalStats, setGlobalStats] = useState(null);
  const [monitors, setMonitors] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [toast, setToast] = useState(null);
  const [currentEnv, setCurrentEnv] = useState(null);
  const [envFilter, setEnvFilter] = useState('all');

  // Listen for hash changes (back/forward buttons)
  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // When route changes to a detail page, load the monitor
  useEffect(() => {
    if (view === 'detail' && routeMonitorId && (!selectedMonitor || selectedMonitor.websiteId !== routeMonitorId)) {
      const envParam = envFilter !== 'all' ? { env: envFilter } : {};
      fetchDashboardData('monitor', { id: routeMonitorId, ...envParam })
        .then(setSelectedMonitor)
        .catch(err => {
          console.error('Error loading monitor:', err);
          navigate('#/monitors');
        });
    }
  }, [view, routeMonitorId, envFilter]);

  // Show a toast notification that auto-dismisses
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };
  
  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const envParam = envFilter !== 'all' ? { env: envFilter } : {};

      const [overview, monitorList] = await Promise.all([
        fetchDashboardData('overview', envParam),
        fetchDashboardData('monitors', envParam)
      ]);

      setGlobalStats(overview.global);
      setMonitors(monitorList);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [envFilter]);

  // Initial load + detect current environment
  useEffect(() => {
    loadData();
    fetchEnvironment().then(setCurrentEnv);
  }, [loadData]);
  
  // Auto-refresh every 30 seconds (but not on detail view to avoid disrupting chart interactions)
  useEffect(() => {
    if (view === 'detail') return; // Don't auto-refresh on detail page
    
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData, view]);
  
  // Check all monitors
  const handleCheckAll = async () => {
    try {
      setChecking(true);
      const result = await triggerCheck();
      const up = result.results?.filter(r => r.isUp).length || 0;
      const down = result.results?.filter(r => !r.isUp).length || 0;

      // Refresh all UI data
      await loadData();
      setChecking(false);

      if (down > 0) {
        showToast(`Checked ${result.checked} sites — ${up} up, ${down} down`, 'warning');
      } else {
        showToast(`Checked ${result.checked} sites — all up`, 'success');
      }
    } catch (err) {
      console.error('Error checking all monitors:', err);
      showToast('Failed to check monitors: ' + err.message, 'error');
      setChecking(false);
    }
  };

  // Check a single monitor
  const handleCheckOne = async (websiteId) => {
    try {
      setChecking(true);
      const result = await triggerCheck(websiteId);
      const check = result.results?.[0];

      // Refresh detail view and global data
      if (selectedMonitor) {
        await refreshDetail(websiteId);
      } else {
        await loadData();
      }
      setChecking(false);

      if (check?.isUp) {
        showToast(`${check.name} is up — ${check.responseTime}ms`, 'success');
      } else {
        showToast(`${check?.name || 'Site'} is down: ${check?.error || `HTTP ${check?.status}`}`, 'error');
      }
    } catch (err) {
      console.error('Error checking monitor:', err);
      showToast('Failed to check monitor: ' + err.message, 'error');
      setChecking(false);
    }
  };

  // Refresh the current detail view fully (stats, charts, incidents)
  const refreshDetail = async (websiteId) => {
    try {
      const envParam = envFilter !== 'all' ? { env: envFilter } : {};
      const [freshMonitor, overview, monitorList] = await Promise.all([
        fetchDashboardData('monitor', { id: websiteId, ...envParam }),
        fetchDashboardData('overview', envParam),
        fetchDashboardData('monitors', envParam)
      ]);
      setSelectedMonitor(freshMonitor);
      setGlobalStats(overview.global);
      setMonitors(monitorList);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  };

  // Delete a single incident
  const handleDeleteIncident = async (incidentId) => {
    setSelectedMonitor(prev => ({
      ...prev,
      recentIncidents: prev.recentIncidents.filter(i => i.id !== incidentId)
    }));

    try {
      await deleteIncidentApi(incidentId);
      await refreshDetail(selectedMonitor.websiteId);
      showToast('Incident deleted', 'success');
    } catch (err) {
      console.error('Error deleting incident:', err);
      showToast('Failed to delete incident: ' + err.message, 'error');
      await refreshDetail(selectedMonitor.websiteId);
    }
  };

  // Delete all incidents for a monitor
  const handleDeleteAllIncidents = async (websiteId) => {
    setSelectedMonitor(prev => ({
      ...prev,
      recentIncidents: []
    }));

    try {
      await deleteAllIncidentsApi(websiteId);
      await refreshDetail(websiteId);
      showToast('All incidents cleared', 'success');
    } catch (err) {
      console.error('Error deleting incidents:', err);
      showToast('Failed to delete incidents: ' + err.message, 'error');
      await refreshDetail(websiteId);
    }
  };

  // Delete a website and all its data
  const handleDeleteWebsite = async (websiteId, name) => {
    setMonitors(prev => prev.filter(m => m.websiteId !== websiteId));
    setSelectedMonitor(null);
    navigate('#/monitors');

    try {
      await deleteWebsiteApi(websiteId);
      await loadData();
      showToast(`${name} deleted`, 'success');
    } catch (err) {
      console.error('Error deleting website:', err);
      showToast('Failed to delete website: ' + err.message, 'error');
      await loadData();
    }
  };

  // Handle monitor selection
  const handleSelectMonitor = (monitor) => {
    navigate(`#/monitor/${monitor.websiteId}`);
  };

  // Handle back from detail
  const handleBackFromDetail = () => {
    setSelectedMonitor(null);
    navigate('#/monitors');
    loadData();
  };
  
  if (loading && !globalStats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 ${
            toast.type === 'success' ? 'bg-green-600 text-white' :
            toast.type === 'warning' ? 'bg-yellow-500 text-white' :
            toast.type === 'error' ? 'bg-red-600 text-white' :
            'bg-gray-800 text-white'
          }`}>
            <span>{
              toast.type === 'success' ? '\u2713' :
              toast.type === 'warning' ? '!' :
              toast.type === 'error' ? '\u2717' : ''
            }</span>
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">\u00d7</button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Website Monitor Dashboard
              </h1>
              {lastUpdate && (
                <p className="text-sm text-gray-500 mt-1">
                  Last updated: {formatDistanceToNow(lastUpdate, { addSuffix: true })}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <select
                  value={envFilter}
                  onChange={(e) => setEnvFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Data</option>
                  <option value="production">Production</option>
                  <option value="local">Local</option>
                </select>
                {envFilter === 'local' && (
                  <button
                    onClick={async () => {
                      if (confirm('Clear ALL local check data and incidents? This cannot be undone.')) {
                        try {
                          const result = await clearEnvironmentData('local');
                          await loadData();
                          showToast(`Cleared ${result.deleted.checksDeleted} checks, ${result.deleted.incidentsDeleted} incidents`, 'success');
                        } catch (err) {
                          showToast('Failed to clear local data: ' + err.message, 'error');
                        }
                      }
                    }}
                    className="px-3 py-2 text-sm border border-red-400 text-red-600 rounded-lg hover:bg-red-50 transition"
                    title="Delete all local environment data"
                  >
                    Clear Local
                  </button>
                )}
              </div>
              {currentEnv && (
                <span className={`px-2 py-1 text-xs rounded font-medium ${
                  currentEnv === 'production' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {currentEnv}
                </span>
              )}
              <button
                onClick={handleCheckAll}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                disabled={checking}
              >
                {checking ? 'Checking...' : 'Check All Sites'}
              </button>
              <button
                onClick={loadData}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
          
          {/* Navigation */}
          {view !== 'detail' && (
            <nav className="mt-4 flex gap-4 border-b border-gray-200">
              <button
                onClick={() => navigate('#/')}
                className={`pb-2 px-1 font-medium text-sm ${
                  view === 'overview'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => navigate('#/monitors')}
                className={`pb-2 px-1 font-medium text-sm ${
                  view === 'monitors'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Monitors ({monitors.length})
              </button>
              <button
                onClick={() => navigate('#/clients')}
                className={`pb-2 px-1 font-medium text-sm ${
                  view === 'clients'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Clients
              </button>
              <button
                onClick={() => navigate('#/endpoints')}
                className={`pb-2 px-1 font-medium text-sm ${
                  view === 'endpoints'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                API Endpoints
              </button>
            </nav>
          )}
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'overview' && (
          <DashboardOverview
            globalStats={globalStats}
            monitors={monitors}
          />
        )}
        
        {view === 'monitors' && (
          <MonitorList
            monitors={monitors}
            onSelectMonitor={handleSelectMonitor}
          />
        )}
        
        {view === 'detail' && selectedMonitor && (
          <MonitorDetail
            monitor={selectedMonitor}
            onBack={handleBackFromDetail}
            onCheckNow={handleCheckOne}
            checking={checking}
            onDeleteIncident={handleDeleteIncident}
            onDeleteAllIncidents={handleDeleteAllIncidents}
            onDeleteWebsite={handleDeleteWebsite}
            envFilter={envFilter}
            onRefresh={() => refreshDetail(selectedMonitor.websiteId)}
            showToast={showToast}
          />
        )}

        {view === 'clients' && (
          <ClientsView />
        )}

        {view === 'endpoints' && (
          <EndpointsView />
        )}
      </main>
    </div>
  );
}

// Render app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

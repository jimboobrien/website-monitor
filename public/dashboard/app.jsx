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
function ResponseTimeChart({ monitorId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(24);
  
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const history = await fetchDashboardData('response-time', { id: monitorId, hours: timeRange });
        
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
function UptimeChart({ monitorId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(7);
  
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const history = await fetchDashboardData('uptime-history', { id: monitorId, days: timeRange });
        
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

// Monitor Detail Component
function MonitorDetail({ monitor, onBack, onCheckNow, checking }) {
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
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <ResponseTimeChart monitorId={monitor.websiteId} />
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <UptimeChart monitorId={monitor.websiteId} />
        </div>
      </div>
      
      {/* Recent Incidents */}
      {monitor.recentIncidents.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Incidents ({monitor.recentIncidents.length})
          </h3>
          <div className="space-y-3">
            {monitor.recentIncidents.map((incident, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  incident.type === 'down' ? 'bg-red-500' : 'bg-yellow-500'
                }`}></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {incident.type === 'down' ? '🔴 Monitor Down' : '⚠️ Issues Detected'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(incident.timestamp), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{incident.message}</p>
                  {incident.issues && incident.issues.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {incident.issues.map((issue, i) => (
                        <li key={i} className="text-xs text-gray-500 ml-4">
                          • {issue.type}: {issue.message}
                        </li>
                      ))}
                    </ul>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.url.toLowerCase().includes(searchTerm.toLowerCase());
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
            placeholder="Search monitors..."
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
  const [view, setView] = useState('overview'); // 'overview', 'monitors', 'detail', or 'endpoints'
  const [selectedMonitor, setSelectedMonitor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [globalStats, setGlobalStats] = useState(null);
  const [monitors, setMonitors] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [overview, monitorList] = await Promise.all([
        fetchDashboardData('overview'),
        fetchDashboardData('monitors')
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
  }, []);
  
  // Initial load
  useEffect(() => {
    loadData();
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
      await triggerCheck();
      // Wait a moment for data to propagate, then refresh
      setTimeout(() => {
        loadData();
        setChecking(false);
      }, 1500);
    } catch (err) {
      console.error('Error checking all monitors:', err);
      alert('Failed to check monitors: ' + err.message);
      setChecking(false);
    }
  };

  // Check a single monitor
  const handleCheckOne = async (websiteId) => {
    try {
      setChecking(true);
      await triggerCheck(websiteId);
      setTimeout(() => {
        loadData();
        setChecking(false);
      }, 1500);
    } catch (err) {
      console.error('Error checking monitor:', err);
      alert('Failed to check monitor: ' + err.message);
      setChecking(false);
    }
  };

  // Handle monitor selection
  const handleSelectMonitor = async (monitor) => {
    // Fetch fresh data for the selected monitor
    try {
      const freshData = await fetchDashboardData('monitor', { id: monitor.websiteId });
      setSelectedMonitor(freshData);
      setView('detail');
    } catch (err) {
      console.error('Error loading monitor detail:', err);
      alert('Failed to load monitor details: ' + err.message);
    }
  };
  
  // Handle back from detail
  const handleBackFromDetail = () => {
    setSelectedMonitor(null);
    setView('monitors');
    loadData(); // Refresh data when going back
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
                onClick={() => setView('overview')}
                className={`pb-2 px-1 font-medium text-sm ${
                  view === 'overview'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setView('monitors')}
                className={`pb-2 px-1 font-medium text-sm ${
                  view === 'monitors'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Monitors ({monitors.length})
              </button>
              <button
                onClick={() => setView('clients')}
                className={`pb-2 px-1 font-medium text-sm ${
                  view === 'clients'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Clients
              </button>
              <button
                onClick={() => setView('endpoints')}
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

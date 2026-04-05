const { useState, useEffect, useCallback, useMemo } = React;
const { formatDistanceToNow, format } = dateFns;
const { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = Recharts;

// API Base URL - adjust for your deployment
const API_BASE = '/.netlify/functions/dashboard-data';

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
function MonitorDetail({ monitor, onBack }) {
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
          <span>Client: {monitor.clientId || 'Uncategorized'}</span>
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
      
      {/* Monitor Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monitor Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Client:</span>
            <span className="ml-2 text-gray-900">{monitor.clientId || 'Uncategorized'}</span>
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
  
  return (
    <div 
      className="monitor-card bg-white rounded-lg shadow p-6 cursor-pointer"
      onClick={onClick}
    >
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
        {monitor.features.visualCheck && (
          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
            📸 Visual
          </span>
        )}
      </div>
      
      {monitor.recentIncidents.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-red-600 font-medium">
            {monitor.recentIncidents.length} recent incident{monitor.recentIncidents.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}

// Monitor List Component
function MonitorList({ monitors, onSelectMonitor }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('all');
  const [sortBy, setSortBy] = useState('status');
  
  // Get unique clients
  const clients = [...new Set(monitors.map(m => m.clientId))].filter(Boolean);
  
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
            {clients.map(client => (
              <option key={client} value={client}>{client}</option>
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

// Main App Component
function App() {
  const [view, setView] = useState('overview'); // 'overview', 'monitors', or 'detail'
  const [selectedMonitor, setSelectedMonitor] = useState(null);
  const [loading, setLoading] = useState(true);
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
            
            <div className="flex items-center gap-4">
              <button
                onClick={loadData}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                disabled={loading}
              >
                {loading ? 'Refreshing...' : '🔄 Refresh'}
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
          />
        )}
      </main>
    </div>
  );
}

// Render app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

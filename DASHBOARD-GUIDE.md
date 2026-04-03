# Dashboard User Guide

## 🎉 What We Built

A complete UptimeRobot-style dashboard for monitoring website uptime, performance, and health. The dashboard provides real-time visibility into all your monitored websites with beautiful charts, detailed statistics, and incident tracking.

---

## 📱 Features Overview

### Overview Page
The main dashboard showing aggregate statistics across all monitors:

**Global Stats Cards:**
- **Total Monitors** - Total count of active monitors
- **Up** - Number and percentage of monitors currently up
- **Down** - Number and percentage of monitors currently down (highlighted in red if any)
- **Overall Uptime** - Average uptime percentage across all monitors (24h)

**Recent Incidents Feed:**
- Live feed of the last 10 incidents across all monitors
- Shows incident type (down/issues), monitor name, error message
- Timestamp with relative time (e.g., "2 hours ago")

### Monitors Page
Grid view of all monitors with search, filter, and sort capabilities:

**Monitor Cards Display:**
- Monitor name and URL
- Current status badge (🟢 Up, 🔴 Down, ⚪ Unknown)
- 24h uptime percentage (color-coded: green ≥99%, yellow ≥95%, red <95%)
- Average response time (24h)
- Last check timestamp
- Visual monitoring indicator (if enabled)
- Recent incident count

**Filtering & Sorting:**
- **Search** - Filter by monitor name or URL
- **Client Filter** - Show monitors for specific clients only
- **Sort Options:**
  - By Status (down first)
  - By Name (alphabetical)
  - By Uptime (lowest first)
  - By Response Time (slowest first)

### Monitor Detail Page
Comprehensive view for individual monitors:

**Stats Overview:**
- 4 stat cards: 24h uptime, 7d uptime, 30d uptime, avg response time
- Current status and last check time
- Monitor features (visual checks, custom checks count)
- Client assignment

**Response Time Chart:**
- Line graph showing response time trends
- Configurable time ranges: 6h, 12h, 24h, 48h
- Interactive tooltips on hover
- Auto-scaling Y-axis for optimal viewing

**Daily Uptime Chart:**
- Bar chart showing uptime percentage per day
- Configurable time ranges: 7d, 14d, 30d, 90d
- Visual representation of monitor reliability
- Green bars = high uptime

**Recent Incidents:**
- Detailed list of recent failures/issues
- Incident type (down vs issues)
- Full error messages
- Timestamp with date and time
- Custom check failures (if applicable)

**Actions:**
- **Check Now** - Trigger manual check (Phase 4)
- **Edit** - Modify monitor settings (Phase 4)
- **Pause** - Temporarily disable monitoring (Phase 4)
- **Delete** - Remove monitor with confirmation (Phase 4)

---

## 🚀 How to Use

### 1. Access the Dashboard

**Local Development:**
```bash
npm run dev
# Visit: http://localhost:8888/dashboard/
```

**Production:**
```
https://your-site.netlify.app/dashboard/
```

### 2. Navigate the Interface

**From Home:**
- Click "📊 Dashboard" link on the main page

**Dashboard Navigation:**
- **Overview Tab** - Global statistics and recent incidents
- **Monitors Tab** - Full monitor list with filters
- **Click any monitor card** - Opens detailed view
- **Back Button** - Returns from detail to monitor list

### 3. Monitor Your Sites

**Check Overall Health:**
1. Go to Overview tab
2. Review global stats cards
3. Check if any monitors are down
4. Scan recent incidents feed

**Find Specific Monitor:**
1. Go to Monitors tab
2. Use search box to filter by name/URL
3. Or select client from dropdown
4. Sort by status to see issues first

**Analyze Monitor Performance:**
1. Click on a monitor card
2. Review uptime percentages (24h, 7d, 30d)
3. Check response time trends in graph
4. View daily uptime reliability
5. Investigate recent incidents

**Compare Time Periods:**
1. Open monitor detail
2. Change response time range (6h → 48h)
3. Change uptime chart range (7d → 90d)
4. Identify patterns and trends

---

## 📊 Understanding the Data

### Uptime Percentages
- **99.9%+** = Excellent (green)
- **95-99%** = Good but watch (yellow)
- **<95%** = Needs attention (red)

### Response Times
- **<500ms** = Fast
- **500-1000ms** = Normal
- **>1000ms** = Slow (investigate)

### Incident Types
- **🔴 Monitor Down** - Site completely unreachable
- **⚠️ Issues Detected** - Visual changes or custom check failures

---

## 🎨 Color Coding

**Status Indicators:**
- 🟢 Green = Monitor is up and healthy
- 🔴 Red = Monitor is down or failing
- ⚪ Gray = Status unknown (no checks yet)

**Uptime Colors:**
- Green (≥99%) = Excellent reliability
- Yellow (95-98.9%) = Acceptable but monitor closely
- Red (<95%) = Poor reliability, needs investigation

**Feature Badges:**
- 📸 Purple = Visual monitoring enabled
- ✓ Blue = Custom element checks configured

---

## ⚡ Performance Features

**Auto-Refresh:**
- Dashboard data refreshes every 30 seconds automatically
- Disabled on detail page to allow smooth chart interaction
- Manual refresh button available anytime

**Responsive Design:**
- Mobile-friendly (1 column on phones)
- Tablet-optimized (2 columns)
- Desktop layout (3 columns)
- Charts adapt to screen size

**Fast Loading:**
- Loads all monitor data in parallel
- Caches results for quick navigation
- Progressive loading states

---

## 🔧 Troubleshooting

### Dashboard shows "Error Loading Dashboard"
**Solution:** 
- Check if monitoring service is running
- Verify config.json exists and is valid
- Check browser console for API errors
- Try manual refresh button

### No data in charts
**Possible causes:**
- Monitor is new (no history yet)
- Storage directory is empty
- Monitor hasn't run any checks

**Solution:**
- Wait for scheduled checks to run
- Trigger manual check (Phase 4)
- Check if monitor function is deployed

### Monitors not showing up
**Check:**
- config.json has websites configured
- Website IDs are consistent
- No JSON syntax errors in config

---

## 📁 Technical Details

### API Endpoints Used

**Overview Data:**
```
GET /.netlify/functions/dashboard-data?action=overview
```

**Monitor List:**
```
GET /.netlify/functions/dashboard-data?action=monitors
GET /.netlify/functions/dashboard-data?action=monitors&client=client-id
```

**Monitor Detail:**
```
GET /.netlify/functions/dashboard-data?action=monitor&id=website-id
```

**Response Time History:**
```
GET /.netlify/functions/dashboard-data?action=response-time&id=website-id&hours=24
```

**Uptime History:**
```
GET /.netlify/functions/dashboard-data?action=uptime-history&id=website-id&days=7
```

### Data Sources
- Monitor status: `/tmp/website-monitor/history/{websiteId}.json`
- Configuration: `config.json` at repo root
- Calculated on-the-fly from check history

### Technology Stack
- **React 18** - UI framework (CDN-loaded)
- **Tailwind CSS** - Styling
- **Recharts** - Charts and graphs
- **date-fns** - Time formatting
- **Netlify Functions** - API backend

---

## 🎯 Next Steps (Phase 4)

The dashboard UI is complete! Next phase will add:

1. **Add/Edit Monitors** - Create and modify monitors via UI
2. **Pause/Resume** - Temporarily disable monitoring
3. **Delete Monitors** - Remove monitors with confirmation
4. **Manual Checks** - Trigger on-demand monitoring
5. **Client Management** - Organize monitors by client
6. **Bulk Operations** - Act on multiple monitors at once

---

## 💡 Tips & Best Practices

**For Web Agencies:**
- Group monitors by client for easy filtering
- Enable visual checks on client homepages
- Check the dashboard daily for issues
- Set up email alerts for critical sites

**For E-commerce:**
- Monitor checkout pages with custom checks
- Track product page response times
- Enable visual checks on key landing pages
- Watch for downtime during peak hours

**For Personal Projects:**
- Start with basic HTTP monitoring
- Add visual checks for important pages
- Review weekly uptime trends
- Investigate spikes in response time

---

## 📞 Support

- **Documentation:** See README.md and PHASE3-PROGRESS.md
- **API Docs:** Function header comments
- **Issues:** GitHub repository
- **Tasks:** See tasks.json for roadmap

---

**Built with ❤️ for reliable web monitoring**

Version: Phase 3 Complete
Last Updated: 2026-04-03

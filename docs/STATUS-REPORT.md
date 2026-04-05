# Website Monitor - Supabase Migration Status Report

**Date:** April 3, 2026  
**Status:** ⚠️ Supabase Ready - Scheduled Monitoring DISABLED Until Migration Complete  

---

## 🎯 Goal

Migrate from ephemeral file-based storage (`/tmp/`) to persistent Supabase database to ensure:
- ✅ No fake/mock data in dashboard
- ✅ Real monitoring data persists across deploys
- ✅ Proper analytics and historical tracking
- ✅ Screenshot/baseline storage
- ✅ Incident tracking

---

## ⚠️ IMPORTANT: Scheduled Monitoring Disabled

**Scheduled monitoring has been temporarily disabled** in `netlify.toml` because:

- ❌ Monitor functions still use old file-based storage (`/tmp`)
- ✅ Dashboard now queries Supabase database
- ❌ Data mismatch: monitors write to `/tmp`, dashboard reads from Supabase
- ❌ Results in empty dashboard despite monitors running
- ❌ Wastes Netlify function execution time

**To re-enable:** Update monitor functions to save to Supabase (see "Next Phase" section)

**Manual testing still works:** You can trigger monitors via URL endpoints

See `docs/MONITORING-STATUS.md` for full details.

---

## ✅ What Has Been Completed

### 1. Supabase Integration Code
- ✅ `netlify/functions/lib/supabase.js` - Complete service layer
  - Website CRUD operations
  - Client management
  - Monitor check storage/retrieval
  - Incident tracking
  - Alert history
  - Visual baseline management
  - Storage (screenshots/baselines)

### 2. Dashboard Updated
- ✅ `netlify/functions/lib/dashboard-service-supabase.js` - New dashboard service
- ✅ `netlify/functions/dashboard-data.js` - Updated to use Supabase
- ✅ Dashboard will now query database instead of `/tmp/` files
- ✅ No mock data in dashboard code

### 3. Setup Scripts Created
- ✅ `setup-supabase.js` - Database schema setup
- ✅ `migrate-config-to-supabase.js` - Config migration tool
- ✅ `SUPABASE-MIGRATION-GUIDE.md` - Complete documentation
- ✅ `SETUP-CHECKLIST.md` - Step-by-step instructions
- ✅ This status report

### 4. Dependencies Installed
- ✅ `@supabase/supabase-js` package added
- ✅ Package.json updated

### 5. Environment Configuration
- ✅ Supabase credentials in local `.env`
- ⚠️ Need to add to Netlify environment variables

---

## ⏳ What Needs to Be Done (Manual Steps)

### Step 1: Create Database Tables (5 minutes)

```bash
cd /root/.openclaw/workspace/website-status-monitor
node setup-supabase.js
```

Copy the SQL output and run it here:
https://XXXXXXXXXXXXXXXXX.supabase.co/project/_/sql/new

This creates 6 tables:
- `clients` - Customer information
- `websites` - Monitor configuration
- `monitor_checks` - Time-series check results
- `incidents` - Downtime tracking
- `visual_baselines` - Screenshot metadata
- `alert_history` - Notification log

### Step 2: Create Storage Buckets (2 minutes)

Go to: https://XXXXXXXXXXXXXXXXX.supabase.co/project/_/storage

Create two public buckets:
1. `screenshots` (5MB limit)
2. `baselines` (5MB limit)

### Step 3: Migrate Config Data (1 minute)

```bash
node migrate-config-to-supabase.js
```

This reads `config.json` and populates:
- Clients → `clients` table
- Websites → `websites` table

### Step 4: Update Netlify Environment Variables (3 minutes)

Go to: Netlify Dashboard → Site settings → Environment variables

Add:
```
NEXT_PUBLIC_SUPABASE_URL=https://XXXXXXXXXXXXXXXXX.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=XXXXXXXXXXXXXXXXX
SUPABASE_SERVICE_KEY=XXXXXXXXXXXXXXXXX
```

### Step 5: Test Locally (5 minutes)

```bash
netlify dev
# Visit: http://localhost:8888/dashboard/
```

Should see empty dashboard (no errors = success!)

### Step 6: Deploy (1 minute)

```bash
git add .
git commit -m "Migrate to Supabase"
git push
```

---

## 📊 Current State Analysis

### Dashboard Data Flow

**Before (File-based):**
```
Dashboard → dashboard-data.js → dashboard-service.js → /tmp/website-monitor/*.json
                                                         ❌ EPHEMERAL (lost on restart)
                                                         ❌ NO REAL DATA YET
```

**After (Supabase):**
```
Dashboard → dashboard-data.js → dashboard-service-supabase.js → Supabase PostgreSQL
                                                                  ✅ PERSISTENT
                                                                  ✅ REAL DATA (when monitors run)
```

### What Will Show in Dashboard

**Right Now (Before Monitor Functions Updated):**
- Dashboard loads but shows 0 monitors
- No fake data, no mock data
- Just empty state (which is correct!)

**After Monitor Functions Updated:**
- Dashboard shows real monitors from `websites` table
- Real check results from `monitor_checks` table
- Real uptime percentages
- Real response times
- Real incidents

---

## 🚀 Next Phase: Update Monitor Functions

After Supabase setup is complete, these files need updates:

### Priority 1: Core Monitoring
- `netlify/functions/monitor.js` → Save checks to `supabase.saveMonitorCheck()`
- `netlify/functions/monitor-enhanced.js` → Same as above

### Priority 2: Visual Monitoring
- `netlify/functions/snapshot.js` → Upload to Supabase Storage

### Priority 3: Scheduled Checks
- Enable Netlify scheduled functions
- Or setup external cron (GitHub Actions, etc.)

---

## 🎉 Benefits of This Migration

### Data Persistence
- ✅ Check history survives deployments
- ✅ Baselines/screenshots permanently stored
- ✅ Incident tracking across restarts

### Analytics & Insights
- ✅ SQL queries for custom reports
- ✅ Long-term trend analysis
- ✅ Client-specific dashboards

### Scalability
- ✅ Database indexes for fast queries
- ✅ 500MB free tier (enough for 25+ sites)
- ✅ Real-time subscriptions ready

### No Fake Data
- ✅ Dashboard only shows real monitoring results
- ✅ Empty state when no data (correct behavior)
- ✅ Accurate statistics and uptime calculations

---

## 📋 Files Changed

### New Files
- `netlify/functions/lib/supabase.js` (service layer)
- `netlify/functions/lib/dashboard-service-supabase.js` (dashboard queries)
- `setup-supabase.js` (database setup)
- `migrate-config-to-supabase.js` (data migration)
- `SUPABASE-MIGRATION-GUIDE.md` (documentation)
- `SETUP-CHECKLIST.md` (step-by-step guide)
- `STATUS-REPORT.md` (this file)

### Modified Files
- `netlify/functions/dashboard-data.js` (uses new service)
- `package.json` (added @supabase/supabase-js)
- `package-lock.json` (dependency lock)

### Files to Be Modified (Next Phase)
- `netlify/functions/monitor.js`
- `netlify/functions/monitor-enhanced.js`
- `netlify/functions/snapshot.js`

---

## 🆘 If Something Goes Wrong

### Dashboard shows error
1. Check browser console for details
2. Check Netlify function logs
3. Verify Netlify env vars are set
4. Verify Supabase tables exist

### Migration script fails
1. Ensure tables created first (Step 1)
2. Check `config.json` is valid JSON
3. Verify Supabase credentials in `.env`

### No data in dashboard
1. This is expected until monitors write to database!
2. Dashboard is working correctly showing empty state
3. Run a test check to generate data

---

## ✅ Ready to Proceed?

**Total time estimate: ~20 minutes**

Follow the checklist:
1. Read `SETUP-CHECKLIST.md`
2. Complete Steps 1-6
3. Verify dashboard loads
4. Let me know when ready for Phase 2 (update monitor functions)

---

**Questions?** Check the migration guide or ask!

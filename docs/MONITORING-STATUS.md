# Monitoring Status

**Last Updated:** April 3, 2026

## ⚠️ Scheduled Monitoring Currently DISABLED

### Why Disabled?

The scheduled monitoring functions have been **temporarily disabled** in `netlify.toml` because:

1. ❌ Monitor functions still use old file-based storage (`/tmp`)
2. ❌ Dashboard now queries Supabase database
3. ❌ Data mismatch: monitors write to `/tmp`, dashboard reads from Supabase
4. ❌ Results in empty dashboard despite monitors running
5. ❌ Wastes Netlify function execution time

### Current State

```toml
# netlify.toml - Scheduled functions COMMENTED OUT

# [[plugins]]
#   package = "@netlify/plugin-functions-cron"

# [functions."monitor"]
#   schedule = "*/5 * * * *"

# [functions."monitor-enhanced"]
#   schedule = "*/10 * * * *"
```

### What Still Works

✅ Manual monitoring via URL:
```
https://your-site.netlify.app/.netlify/functions/monitor?url=https://example.com
```

✅ Dashboard UI loads (shows empty until monitors write to Supabase)

✅ All functions validate and build successfully

### What Needs to Be Done Before Re-enabling

#### Step 1: Complete Supabase Setup
Follow `SETUP-CHECKLIST.md`:
- [ ] Create database tables
- [ ] Create storage buckets
- [ ] Migrate config to database
- [ ] Update Netlify environment variables

#### Step 2: Update Monitor Functions

**Files to modify:**

**`netlify/functions/monitor.js`**
```javascript
// Current (uses config.json + /tmp storage)
const config = require('../../config.json');
// ... saves to /tmp

// Need to change to:
const { getAllWebsites, saveMonitorCheck } = require('./lib/supabase');
// ... saves to Supabase
```

**`netlify/functions/monitor-enhanced.js`**
```javascript
// Same changes as monitor.js
// Plus: use Supabase Storage for screenshots
```

**Key Changes Needed:**

1. Replace `require('../../config.json')` with `getAllWebsites()` from Supabase
2. Replace file-based history storage with `saveMonitorCheck()`
3. Update incident tracking to use `createIncident()` / `resolveIncident()`
4. Save alert history with `saveAlertHistory()`
5. For visual monitoring: use `uploadScreenshot()` and `uploadBaseline()`

#### Step 3: Test Monitor Functions

```bash
# Local testing
netlify dev

# Test monitor endpoint
curl "http://localhost:8888/.netlify/functions/monitor"

# Check Supabase Table Editor → monitor_checks
# Should see new check records
```

#### Step 4: Re-enable Scheduled Monitoring

Once functions are updated and tested:

```toml
# netlify.toml - UNCOMMENT

[[plugins]]
  package = "@netlify/plugin-functions-cron"

[functions."monitor"]
  schedule = "*/5 * * * *"

[functions."monitor-enhanced"]
  schedule = "*/10 * * * *"
```

Deploy and verify:
- Monitors run on schedule
- Data appears in Supabase
- Dashboard shows real-time stats

## Manual Testing (While Disabled)

You can still trigger monitors manually:

### Via Netlify Functions UI
```
https://your-site.netlify.app/.netlify/functions/monitor?url=https://example.com
```

### Via curl
```bash
# Test basic monitor
curl "https://your-site.netlify.app/.netlify/functions/monitor?url=https://google.com"

# Test with multiple sites (once updated to use Supabase)
curl "https://your-site.netlify.app/.netlify/functions/monitor"
```

### Local Development
```bash
netlify dev

# Visit: http://localhost:8888/.netlify/functions/monitor
```

## Timeline

**Current Phase:** Setup & Migration
- ⏳ Complete Supabase setup (~20 min)
- ⏳ Update monitor functions to use Supabase (~2 hours)
- ⏳ Test and validate
- ✅ Re-enable scheduled monitoring

**Estimated time to fully operational:** 2-3 hours of development work

## Questions?

See these docs:
- `SETUP-CHECKLIST.md` - Supabase setup steps
- `STATUS-REPORT.md` - Overall project status
- `SUPABASE-MIGRATION-GUIDE.md` - Detailed migration info

## Quick Reference

**Dashboard:** Shows data from Supabase `monitor_checks` table  
**Monitor functions:** Currently save to `/tmp` (ephemeral)  
**Result:** Empty dashboard until functions are updated  
**Solution:** Update functions → save to Supabase → dashboard populates  

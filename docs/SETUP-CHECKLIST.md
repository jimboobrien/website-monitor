# Website Monitor Supabase Setup Checklist

## ✅ Completed

- [x] Supabase credentials added to `.env`
- [x] @supabase/supabase-js package installed
- [x] Supabase service layer created
- [x] Dashboard updated to use Supabase
- [x] Setup scripts created
- [x] Migration scripts created

## 🔲 To Do (In Order)

### 1. Create Database Tables

```bash
# Get the SQL schema
node setup-supabase.js

# Copy the SQL output and run it in Supabase SQL Editor:
# https://fksomdzgdmgeksubvfxw.supabase.co/project/_/sql/new
```

**Verify:** Check Table Editor - should see 6 tables (clients, websites, monitor_checks, incidents, visual_baselines, alert_history)

### 2. Create Storage Buckets

Go to: https://fksomdzgdmgeksubvfxw.supabase.co/project/_/storage

Create:
- Bucket: `screenshots` (Public, 5MB limit)
- Bucket: `baselines` (Public, 5MB limit)

**Verify:** Storage page shows 2 buckets

### 3. Migrate Config Data

```bash
# Run migration script
node migrate-config-to-supabase.js
```

**Verify:** 
- Check output shows all websites migrated
- Check Table Editor → websites table has your monitors
- Check Table Editor → clients table has your clients

### 4. Update Netlify Environment Variables

Go to: https://app.netlify.com → Your site → Site settings → Environment variables

Add these 3 variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://fksomdzgdmgeksubvfxw.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_ZZphq5YtYbNRd-bpC-Hg4w_gg2P4itk
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrc29tZHpnZG1nZWtzdWJ2Znh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTE3OTM3MiwiZXhwIjoyMDkwNzU1MzcyfQ.YHqFag6Q_52_VHBaMiI64hf1ACgsf_GH0qv6DOvd8xY
```

**Verify:** Environment variables page shows all 3 Supabase vars

### 5. Test Locally

```bash
# Start local dev server
netlify dev

# Test dashboard (should show empty but no errors)
# Open: http://localhost:8888/dashboard/

# Test monitor function (creates a check in database)
# Open: http://localhost:8888/.netlify/functions/monitor?url=https://example.com
```

**Verify:**
- Dashboard loads without errors
- Monitor function returns JSON response
- Check Supabase Table Editor → monitor_checks has new row

### 6. Deploy to Netlify

```bash
git add .
git commit -m "Migrate to Supabase database"
git push

# Or trigger manual deploy in Netlify dashboard
```

**Verify:** 
- Deploy succeeds
- Production dashboard loads: https://your-site.netlify.app/dashboard/
- No console errors

### 7. Update Monitor Functions (Next Phase)

Files to update:
- [ ] `netlify/functions/monitor.js` - Save checks to Supabase
- [ ] `netlify/functions/monitor-enhanced.js` - Save checks to Supabase
- [ ] `netlify/functions/snapshot.js` - Upload to Supabase Storage

## Current Status: Dashboard Ready ✅

The dashboard is now **connected to Supabase** and will show **real data** once monitors start writing to the database.

### What's Working:
✅ Dashboard UI loads  
✅ Supabase connection configured  
✅ Database schema ready  
✅ Config migrated to database  

### What's Next:
⏳ Update monitor functions to write check results to database  
⏳ Run scheduled monitors to generate data  
⏳ Dashboard will automatically populate with real monitoring data  

## Quick Test After Setup

Once everything is deployed:

1. Manually trigger a check:
   ```bash
   curl "https://your-site.netlify.app/.netlify/functions/monitor?url=https://example.com"
   ```

2. Check database:
   - Go to Supabase Table Editor
   - Open `monitor_checks` table
   - Should see the check result

3. Check dashboard:
   - Visit: https://your-site.netlify.app/dashboard/
   - Should show the monitor with stats

## Troubleshooting

### "Could not find the table 'public.clients'"
→ Need to create tables (Step 1)

### "Missing Supabase credentials"
→ Need to add env vars to Netlify (Step 4)

### Dashboard shows "Error Loading Dashboard"
→ Check browser console and Netlify function logs

### No data showing in dashboard
→ Need to run monitor checks to generate data (monitors need to be updated to write to Supabase)

## Documentation

- Full guide: `SUPABASE-MIGRATION-GUIDE.md`
- Database schema: See `setup-supabase.js` output
- Supabase docs: https://supabase.com/docs

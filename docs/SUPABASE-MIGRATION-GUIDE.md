# Supabase Migration Guide

## Current Status

✅ Supabase credentials configured in `.env`  
✅ @supabase/supabase-js installed  
✅ Supabase service layer created (`netlify/functions/lib/supabase.js`)  
✅ Dashboard service updated to use Supabase  
⚠️  Database tables need to be created  
⚠️  Config data needs to be migrated to database  

## Step 1: Create Database Tables

1. **Go to Supabase SQL Editor:**
   - URL: https://fksomdzgdmgeksubvfxw.supabase.co/project/_/sql/new
   - (Or: Supabase Dashboard → SQL Editor → New query)

2. **Run the setup script to get the SQL:**
   ```bash
   node setup-supabase.js
   ```

3. **Copy the SQL output** (between "SQL SCHEMA START" and "SQL SCHEMA END")

4. **Paste into Supabase SQL Editor** and click "Run"

5. **Verify tables were created:**
   - Go to: Table Editor in Supabase Dashboard
   - You should see: `clients`, `websites`, `monitor_checks`, `incidents`, `visual_baselines`, `alert_history`

## Step 2: Create Storage Buckets

1. **Go to Supabase Storage:**
   - Dashboard → Storage

2. **Create two buckets:**
   - Name: `screenshots`
     - Public: ✅ Yes
     - File size limit: 5 MB
   
   - Name: `baselines`
     - Public: ✅ Yes
     - File size limit: 5 MB

## Step 3: Migrate Config to Database

Run the migration script to copy data from `config.json` to Supabase:

```bash
node migrate-config-to-supabase.js
```

This will:
- ✅ Create client records
- ✅ Create website monitor records
- ✅ Set up all configuration

## Step 4: Update Netlify Environment Variables

1. **Go to Netlify Dashboard:**
   - Your site → Site settings → Environment variables

2. **Add Supabase credentials:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://fksomdzgdmgeksubvfxw.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_ZZphq5YtYbNRd-bpC-Hg4w_gg2P4itk
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Redeploy your site** (Netlify will auto-deploy on push, or trigger manually)

## Step 5: Test Everything

1. **Run a test monitor check:**
   ```bash
   netlify dev
   # Then visit: http://localhost:8888/.netlify/functions/monitor?url=https://example.com
   ```

2. **Check database:**
   - Go to Supabase Table Editor → `monitor_checks`
   - You should see the check result

3. **Test dashboard:**
   ```bash
   netlify dev
   # Visit: http://localhost:8888/dashboard/
   ```

## What Changed

### Before (File-based)
- ❌ Config in `config.json`
- ❌ Check results in `/tmp/website-monitor/history/*.json` (ephemeral)
- ❌ Baselines in `/tmp/website-monitor/baselines/*.png` (lost on restart)

### After (Supabase)
- ✅ Config in `websites` and `clients` tables (persistent)
- ✅ Check results in `monitor_checks` table (permanent, queryable)
- ✅ Baselines in Supabase Storage `baselines` bucket (permanent)
- ✅ Snapshots in `screenshots` bucket
- ✅ Incidents tracked in `incidents` table
- ✅ Alert history in `alert_history` table

## Benefits

✅ **Persistent Data** - Survives Netlify deployments  
✅ **Real Analytics** - Query check history with SQL  
✅ **Scalability** - Database indexes for fast queries  
✅ **No Fake Data** - Dashboard shows actual monitor results  
✅ **Visual Monitoring** - Screenshots stored permanently  
✅ **Incident Tracking** - Proper downtime aggregation  

## Troubleshooting

### Tables not created?
- Check SQL output for errors
- Verify you're in the correct project
- Check Table Editor to confirm

### Migration script fails?
- Ensure tables are created first (Step 1)
- Check `config.json` exists and is valid JSON
- Verify `.env` has correct Supabase credentials

### Dashboard shows no data?
- Check that websites were migrated (Table Editor → `websites`)
- Run a manual monitor check to generate data
- Check browser console for API errors

### Functions fail?
- Verify Netlify environment variables are set
- Check Netlify function logs
- Ensure @supabase/supabase-js is in dependencies

## Files Modified

### New Files
- `setup-supabase.js` - Database setup script
- `migrate-config-to-supabase.js` - Config migration script
- `netlify/functions/lib/supabase.js` - Supabase service layer
- `netlify/functions/lib/dashboard-service-supabase.js` - Dashboard data service

### Modified Files
- `netlify/functions/dashboard-data.js` - Now uses Supabase service
- `package.json` - Added @supabase/supabase-js dependency

### To Be Modified (Phase 4)
- `netlify/functions/monitor.js` - Will save to Supabase
- `netlify/functions/monitor-enhanced.js` - Will save to Supabase  
- `netlify/functions/snapshot.js` - Will use Supabase Storage

## Next Steps

Once migration is complete:

1. **Update monitor functions** to save checks to database
2. **Update snapshot function** to use Supabase Storage
3. **Enable scheduled checks** via Netlify cron
4. **Test visual monitoring** with baseline comparisons
5. **Verify dashboard** shows real-time data
6. **Remove old file-based code** once everything works

## Support

- Supabase Docs: https://supabase.com/docs
- This project issues: See `tasks.json`
- Local testing: `netlify dev` to test functions locally

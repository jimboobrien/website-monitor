# Supabase Setup Guide

This guide walks you through creating a Supabase project for the Website Monitor application.

---

## 🎯 Why Supabase?

We're migrating from file-based storage (`/tmp/`) to Supabase because:

- ✅ **Persistent storage** - Data survives deployments
- ✅ **PostgreSQL database** - Powerful SQL queries for analytics
- ✅ **Built-in authentication** - Ready for Phase 8 (multi-user)
- ✅ **Real-time subscriptions** - Live dashboard updates
- ✅ **Free tier** - 500 MB database + 1 GB storage (sufficient for 25+ sites)
- ✅ **Storage buckets** - For screenshots and visual baselines
- ✅ **Row-level security** - Data isolation for multi-tenancy

---

## 📋 Step 1: Create Supabase Project

### 1. Sign Up / Log In

Go to: **https://supabase.com**

- Click "Start your project"
- Sign up with GitHub (recommended) or email
- Verify your email if needed

### 2. Create New Project

1. Click **"New Project"**
2. Choose/create an organization
3. Fill in project details:

```
Project Name:        website-monitor
Database Password:   [Generate strong password - SAVE THIS!]
Region:              Choose closest to your Netlify deployment
Pricing Plan:        Free
```

4. Click **"Create new project"**
5. Wait 2-3 minutes for project to initialize

### 3. Get Your Credentials

Once the project is ready:

1. Go to **Settings** → **API**
2. Copy these values (you'll need them later):

```
Project URL:         https://xxxxxxxxxxxxx.supabase.co
anon/public key:     eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key:    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **Important:** 
- `anon key` = Public key (safe for client-side)
- `service_role key` = Admin key (SECRET - only for server-side!)

---

## 📋 Step 2: Provide Credentials to AI

Copy and paste this template with your actual values:

```
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHgiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxODIyMTg2NSwiZXhwIjoxOTMzNzk3ODY1fQ.xxxxxxxxxxxxxxxxxx
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHgiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjE4MjIxODY1LCJleHAiOjE5MzM3OTc4NjV9.xxxxxxxxxxxxxxxxxx
```

---

## 📋 Step 3: Add to Netlify Environment Variables

Once you have the credentials:

### Option A: Via Netlify Dashboard

1. Go to: https://app.netlify.com
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Click **"Add a variable"**
5. Add these three variables:

```
Key: SUPABASE_URL
Value: https://xxxxxxxxxxxxx.supabase.co

Key: SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Key: SUPABASE_SERVICE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Option B: Via Netlify CLI

```bash
netlify env:set SUPABASE_URL "https://xxxxxxxxxxxxx.supabase.co"
netlify env:set SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
netlify env:set SUPABASE_SERVICE_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### For Local Development

Create/update `.env` file:

```bash
# .env (DO NOT COMMIT!)
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Existing variables
SENDGRID_API_KEY=SG.xxxxx
ALERT_EMAIL=your@email.com
FROM_EMAIL=noreply@yourdomain.com
```

---

## 📋 Step 4: Verify Setup

### Check Project Status

In Supabase Dashboard:
1. Go to **Home**
2. Should see: "Project is ready"
3. Database size: ~0 MB (empty)

### Check API Connection

In Supabase Dashboard:
1. Go to **Settings** → **API**
2. Should see:
   - URL: ✅ Available
   - Keys: ✅ Generated
   - Status: 🟢 Active

---

## 🎉 You're Ready!

Once you've:
- ✅ Created Supabase project
- ✅ Copied the 3 credentials (URL, anon key, service_role key)
- ✅ Added to Netlify environment variables
- ✅ Added to local .env file

**You can now provide the credentials to the AI to begin Phase 4 migration!**

---

## 🗂️ What Happens Next (Phase 4)

The AI will:

1. **Create database schema** (tables, indexes, functions)
2. **Set up Storage buckets** (for screenshots)
3. **Install Supabase client library** (@supabase/supabase-js)
4. **Migrate storage code** (replace file-based with database)
5. **Update monitor functions** (write to database)
6. **Update dashboard API** (read from database)
7. **Test everything** (verify persistence)

**Estimated time:** 4-6 hours of development

---

## 📊 Database Schema Preview

Here's what will be created:

### Tables

```sql
-- Monitor configuration (replaces config.json)
CREATE TABLE websites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  client_id TEXT REFERENCES clients(id),
  check_interval INTEGER DEFAULT 5,
  visual_check_enabled BOOLEAN DEFAULT false,
  custom_checks JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client/customer information
CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time-series check results
CREATE TABLE monitor_checks (
  id BIGSERIAL PRIMARY KEY,
  website_id TEXT NOT NULL REFERENCES websites(id),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL,
  response_time INTEGER,
  status_code INTEGER,
  error_message TEXT,
  issues JSONB
);

-- Aggregated downtime events
CREATE TABLE incidents (
  id BIGSERIAL PRIMARY KEY,
  website_id TEXT NOT NULL REFERENCES websites(id),
  started_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  incident_type TEXT,
  severity TEXT,
  message TEXT,
  metadata JSONB
);

-- Visual baseline metadata
CREATE TABLE visual_baselines (
  website_id TEXT PRIMARY KEY REFERENCES websites(id),
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email/notification history
CREATE TABLE alert_history (
  id BIGSERIAL PRIMARY KEY,
  website_id TEXT REFERENCES websites(id),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  alert_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  success BOOLEAN
);
```

### Indexes

```sql
CREATE INDEX idx_checks_website_timestamp 
  ON monitor_checks(website_id, timestamp DESC);

CREATE INDEX idx_checks_status 
  ON monitor_checks(status);

CREATE INDEX idx_incidents_website_started 
  ON incidents(website_id, started_at DESC);
```

### Storage Buckets

- **baselines** - Visual comparison baseline screenshots
- **screenshots** - Snapshot images

---

## 💡 Tips

### Security Best Practices

- ✅ Never commit `.env` file (it's in .gitignore)
- ✅ Never share `service_role` key publicly
- ✅ Use `anon` key for client-side code
- ✅ Use `service_role` key only in Netlify Functions
- ✅ Enable RLS (Row Level Security) in Phase 8

### Database Management

- **SQL Editor**: Supabase Dashboard → SQL Editor
- **Table Editor**: Visual table editor (like phpMyAdmin)
- **Logs**: Real-time logs of all queries
- **Performance**: Index usage and slow query detection

### Free Tier Limits

Monitor your usage:
- Database: 500 MB (you'll use ~50 MB/month with 25 sites)
- Storage: 1 GB (baselines + snapshots)
- Bandwidth: 5 GB/month
- API Requests: Unlimited

**You're well within limits!**

---

## 🆘 Troubleshooting

### Can't create project

**Issue:** "Unable to create project"

**Solutions:**
- Verify email is confirmed
- Try different browser
- Clear cookies
- Use GitHub sign-in instead

### Can't find API keys

**Issue:** "Where are the API keys?"

**Solution:**
- Go to Settings (gear icon)
- Click "API" in left sidebar
- Keys are under "Project API keys"

### Wrong region selected

**Issue:** "I picked the wrong region"

**Solution:**
- You can't change region after creation
- Create a new project in correct region
- Delete old project (Settings → General → Delete project)

---

## 📞 Support

- **Supabase Docs**: https://supabase.com/docs
- **Supabase Discord**: https://discord.supabase.com
- **This Project**: See tasks.json for roadmap

---

## ✅ Checklist

Before providing credentials to AI:

- [ ] Supabase project created
- [ ] Project fully initialized (not "Setting up...")
- [ ] Copied SUPABASE_URL
- [ ] Copied SUPABASE_ANON_KEY
- [ ] Copied SUPABASE_SERVICE_KEY
- [ ] Added all 3 to Netlify environment variables
- [ ] Added all 3 to local .env file
- [ ] Ready to start Phase 4!

---

**Ready?** Provide your credentials and let's migrate to Supabase! 🚀

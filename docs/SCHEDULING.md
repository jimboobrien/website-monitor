# Monitor Scheduling Configuration

## 📅 Current Schedule

The monitoring system runs automatically on Netlify using scheduled functions (cron jobs).

### Monitor Functions

| Function | Schedule | Interval | Purpose |
|----------|----------|----------|---------|
| **monitor** | `*/5 * * * *` | Every 5 minutes | Basic HTTP uptime checks, response time tracking |
| **monitor-enhanced** | `*/10 * * * *` | Every 10 minutes | Visual comparison + custom element checks |

---

## ⚙️ How It Works

### 1. Netlify.toml Configuration

The schedule is defined in `netlify.toml`:

```toml
# Enable scheduled functions via cron plugin
[[plugins]]
  package = "@netlify/plugin-functions-cron"

# Basic HTTP monitoring - runs every 5 minutes
[functions."monitor"]
  schedule = "*/5 * * * *"

# Enhanced monitoring (visual + custom checks) - runs every 10 minutes
[functions."monitor-enhanced"]
  schedule = "*/10 * * * *"
```

### 2. Netlify Cron Plugin

The `@netlify/plugin-functions-cron` plugin is **automatically installed** by Netlify when it detects the plugin configuration in `netlify.toml`. You don't need to add it to `package.json`.

**What it does:**
- Reads the schedule from netlify.toml
- Triggers functions at specified intervals
- Manages execution in Netlify's infrastructure
- Provides logging and error tracking

---

## 🕐 Cron Expression Reference

Cron expressions use 5 fields:
```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, 0 and 7 = Sunday)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

### Common Examples

| Schedule | Expression | Use Case |
|----------|-----------|----------|
| Every 1 minute | `* * * * *` | Critical sites (high cost) |
| Every 5 minutes | `*/5 * * * *` | **Current basic monitor** |
| Every 10 minutes | `*/10 * * * *` | **Current enhanced monitor** |
| Every 15 minutes | `*/15 * * * *` | Normal sites |
| Every 30 minutes | `*/30 * * * *` | Low priority sites |
| Every hour | `0 * * * *` | Background tasks |
| Every 6 hours | `0 */6 * * *` | Daily checks |
| At 9 AM daily | `0 9 * * *` | Morning reports |
| Every Monday 9 AM | `0 9 * * 1` | Weekly summaries |

### Wildcard Operators

- `*` = Every value (e.g., `* * * * *` = every minute)
- `*/n` = Every n units (e.g., `*/5` = every 5 minutes)
- `n-m` = Range (e.g., `9-17` = 9 AM to 5 PM)
- `n,m` = List (e.g., `1,15,30` = 1st, 15th, 30th minute)

---

## 📊 Function Execution Limits

### Netlify Free Tier
- **125,000 function requests/month**
- **10 second timeout per function**
- Functions can run in background

### Current Usage Estimate

**Basic Monitor (every 5 minutes):**
- 60 min/hour ÷ 5 min = 12 executions/hour
- 12 × 24 hours = 288 executions/day
- 288 × 30 days = **8,640 executions/month**

**Enhanced Monitor (every 10 minutes):**
- 60 min/hour ÷ 10 min = 6 executions/hour
- 6 × 24 hours = 144 executions/day
- 144 × 30 days = **4,320 executions/month**

**Total: ~13,000 executions/month** (well within free tier)

With **25 websites monitored**, this is sustainable on the free tier.

---

## 🔧 Adjusting the Schedule

### To Change Interval

Edit `netlify.toml`:

```toml
# Change to every 15 minutes
[functions."monitor"]
  schedule = "*/15 * * * *"
```

### To Disable Scheduled Monitoring

Comment out or remove the schedule:

```toml
# [functions."monitor"]
#   schedule = "*/5 * * * *"
```

Or remove the entire `[[plugins]]` section.

### To Add Business Hours Only

```toml
# Monday-Friday, 9 AM - 5 PM, every 15 minutes
[functions."monitor"]
  schedule = "*/15 9-17 * * 1-5"
```

---

## 🚀 Deployment & Activation

### After Changing netlify.toml

1. **Commit changes:**
   ```bash
   git add netlify.toml
   git commit -m "Update monitoring schedule"
   git push
   ```

2. **Netlify auto-deploys:**
   - Detects netlify.toml changes
   - Installs @netlify/plugin-functions-cron
   - Activates new schedule

3. **Verify in Netlify Dashboard:**
   - Go to your site → Functions
   - Check for scheduled function indicators
   - View execution logs

### Manual Testing (Without Waiting for Schedule)

Trigger functions manually via URL:

```bash
# Test basic monitor
curl https://your-site.netlify.app/.netlify/functions/monitor

# Test enhanced monitor
curl https://your-site.netlify.app/.netlify/functions/monitor-enhanced

# Test dashboard API
curl https://your-site.netlify.app/.netlify/functions/dashboard-data?action=overview
```

---

## 📈 Monitoring the Monitors

### Check Function Logs

1. Netlify Dashboard → Your site → Functions
2. Click on function name (monitor or monitor-enhanced)
3. View Recent Executions
4. Check for errors or timeouts

### Check Email Alerts

If monitoring is working, you'll receive emails when sites go down (based on `notificationSettings` in config.json).

### Check Dashboard

Visit `https://your-site.netlify.app/dashboard/` to see:
- Last check timestamps
- Uptime percentages
- Recent incidents

If "Last checked" is recent, monitoring is running!

---

## ⚠️ Important Notes

### 1. First Run May Take Time
After deployment, Netlify needs to:
- Build the site
- Install the cron plugin
- Schedule the first execution

**First check may take 5-10 minutes.**

### 2. Cold Starts
Serverless functions have "cold starts" (slower first execution). This is normal.

### 3. Timeout Limits
- Free tier: 10 seconds max
- Pro tier: 26 seconds max

Enhanced monitoring (with visual checks) may approach this limit. Consider:
- Running enhanced checks less frequently (every 10-15 minutes)
- Using basic monitor for more sites
- Upgrading to Pro if needed

### 4. Function Costs Beyond Free Tier

If you exceed 125K executions/month:
- Netlify Pro: 2 million function requests included
- Additional requests: $25 per million

**For reference:**
- 50 sites × every 5 min = ~21,600 executions/month (still free!)
- 100 sites × every 5 min = ~43,200 executions/month (still free!)

---

## 🎯 Optimization Tips

### 1. Tiered Monitoring
Use different intervals based on site importance:

```toml
# Critical sites - every 5 minutes (basic monitor)
[functions."monitor"]
  schedule = "*/5 * * * *"

# Important sites with visual checks - every 10 minutes
[functions."monitor-enhanced"]
  schedule = "*/10 * * * *"

# Could add monitor-low for less critical sites
# [functions."monitor-low"]
#   schedule = "*/30 * * * *"
```

### 2. Business Hours Only
Save executions by monitoring only during business hours:

```toml
# Monday-Friday, 6 AM - 10 PM, every 5 minutes
[functions."monitor"]
  schedule = "*/5 6-22 * * 1-5"
```

### 3. Separate Functions by Priority
Create multiple monitor functions with different schedules based on config.

---

## 🔮 Future Enhancements (Phase 4+)

Potential scheduling improvements:

1. **Per-Monitor Schedules**
   - Define interval per website in config.json
   - Dynamic scheduling based on priority

2. **Adaptive Scheduling**
   - Check more frequently if site has issues
   - Check less frequently if site is stable

3. **Maintenance Windows**
   - Skip checks during scheduled maintenance
   - Defined in config.json per site

4. **On-Demand Checks**
   - Manual trigger via dashboard (Phase 4)
   - API endpoint to trigger specific monitors

---

## 📋 Troubleshooting

### Functions Not Running

**Check:**
1. Is `@netlify/plugin-functions-cron` in netlify.toml?
2. Did you push changes to GitHub?
3. Did Netlify redeploy?
4. Check Netlify function logs for errors

**Solution:**
- Review netlify.toml configuration
- Manually trigger function to test
- Check Netlify build logs

### Timeouts

**Check:**
- Function logs show timeout errors
- Enhanced monitor timing out on visual checks

**Solution:**
- Reduce check frequency (every 10-15 min)
- Optimize check logic
- Upgrade to Netlify Pro (26s timeout)

### Too Many Executions

**Check:**
- Netlify usage dashboard
- Calculate expected executions

**Solution:**
- Increase interval (5 min → 10 min)
- Use business hours only
- Reduce number of monitored sites

---

## ✅ Verification Checklist

After updating scheduling:

- [ ] netlify.toml has plugin configuration
- [ ] Cron expressions are valid
- [ ] Changes committed and pushed
- [ ] Netlify redeploy completed
- [ ] Functions show up in Netlify dashboard
- [ ] Manual test successful
- [ ] First scheduled execution completed
- [ ] Email alerts received (if site down)
- [ ] Dashboard shows recent check times

---

**Last Updated:** 2026-04-03
**Version:** Phase 3 - Dashboard Complete

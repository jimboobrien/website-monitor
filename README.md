# Website Status Monitor 🔍

A powerful, free website monitoring tool with visual comparison testing, custom element checking, and email alerts via SendGrid.

## ✨ Features

### Phase 1 (Basic Monitoring)
- ✅ **Automated monitoring** - Checks websites every 5 minutes
- 👥 **Client management** - Group websites by client for organized tracking
- 📧 **Email alerts** - SendGrid integration for instant notifications
- 🆓 **Free deployment** - Runs on Netlify's free tier
- ⚡ **Fast** - Serverless functions for quick checks
- 📊 **Response tracking** - Monitors response times and status codes
- 🔧 **Easy configuration** - Simple JSON config file

### 🚀 Phase 2 (Advanced Features) - NEW!
- 🎨 **Visual comparison testing** - Detect layout breaks and design changes
- 🎯 **Custom element checks** - Verify sliders, forms, images, and links work
- 💾 **Historical tracking** - Store uptime history and trends
- 🔍 **Deep inspection** - Run custom JavaScript for advanced checks
- 📸 **Website snapshots** - Your own Wayback Machine (capture screenshots & HTML over time)

**[📖 Read the Phase 2 Documentation](PHASE2.md)**  
**[📸 Read the Snapshots Documentation](SNAPSHOTS.md)**

## 🚀 Quick Start

### 1. Clone this repository

```bash
git clone https://github.com/jimboobrien/website-monitor.git
cd website-monitor
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure your clients and websites

Edit `config.json`:

```json
{
  "clients": [
    {
      "id": "acme-corp",
      "name": "Acme Corporation",
      "email": "admin@acmecorp.com",
      "notes": "Main corporate client"
    },
    {
      "id": "joes-shop",
      "name": "Joe's Coffee Shop",
      "email": "joe@joescoffee.com",
      "notes": "Local business"
    }
  ],
  "websites": [
    {
      "name": "Acme Main Site",
      "url": "https://acmecorp.com",
      "clientId": "acme-corp"
    },
    {
      "name": "Joe's Coffee Shop",
      "url": "https://joescoffee.com",
      "clientId": "joes-shop"
    }
  ]
}
```

### 4. Get SendGrid API Key

1. Sign up for a free SendGrid account: https://signup.sendgrid.com/
2. Navigate to **Settings** → **API Keys**
3. Click **Create API Key**
4. Select **Restricted Access** and enable **Mail Send**
5. Copy the API key (save it - you won't see it again!)

### 5. Deploy to Netlify

#### Option A: Via Netlify Dashboard (Recommended)

1. Push this repo to your GitHub account
2. Go to https://app.netlify.com/
3. Click **Add new site** → **Import an existing project**
4. Connect your GitHub repo
5. Netlify will auto-detect the settings - click **Deploy**

#### Option B: Via Netlify CLI

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

### 6. Set environment variables in Netlify

In your Netlify dashboard:

1. Go to **Site settings** → **Environment variables**
2. Add these variables:
   - `SENDGRID_API_KEY` - Your SendGrid API key
   - `ALERT_EMAIL` - Email address to receive alerts
   - `FROM_EMAIL` - Verified sender email in SendGrid

### 7. Monitor automatically

Netlify will automatically run your monitor function every 5 minutes based on the `netlify.toml` configuration.

---

## 🚀 Phase 2: Advanced Monitoring

**Phase 2 is now available!** It adds visual comparison testing and custom element checks.

### What can Phase 2 do?

**Visual Comparison:**
- Take screenshots and compare against baselines
- Detect layout breaks, missing content, CSS issues
- Get alerts when your site's appearance changes

**Custom Checks:**
- ✅ Verify sliders/carousels are working
- ✅ Check forms exist and have submit buttons
- ✅ Ensure images loaded properly
- ✅ Confirm links are clickable
- ✅ Run custom JavaScript for advanced checks

### Quick Start with Phase 2

1. **Use the enhanced monitor:**
   ```bash
   cd netlify/functions
   mv monitor.js monitor-basic.js
   mv monitor-enhanced.js monitor.js
   ```

2. **Update your config** with Phase 2 features:
   ```json
   {
     "name": "My Site",
     "url": "https://mysite.com",
     "visualCheck": {
       "enabled": true,
       "threshold": 5.0
     },
     "customChecks": [
       {
         "name": "Hero Slider",
         "type": "slider-working",
         "selector": ".hero-slider"
       }
     ]
   }
   ```

3. **Test locally:**
   ```bash
   npm run test:enhanced
   ```

4. **Push to GitHub** - Netlify auto-deploys!

**[📖 Full Phase 2 Documentation & Examples](PHASE2.md)**

---

## 📋 Configuration Guide

### Client Management

Organize your websites by client for better tracking and reporting:

```json
{
  "clients": [
    {
      "id": "unique-client-id",
      "name": "Client Display Name",
      "email": "client@email.com",
      "notes": "Any additional notes"
    }
  ]
}
```

**Fields:**
- `id` (required) - Unique identifier for the client (use lowercase with hyphens)
- `name` (required) - Display name for the client
- `email` (optional) - Client's email address (shown in alerts)
- `notes` (optional) - Additional information about the client

### Website Configuration

```json
{
  "websites": [
    {
      "name": "Website Display Name",
      "url": "https://example.com",
      "clientId": "client-id-here"
    }
  ]
}
```

**Fields:**
- `name` (required) - Friendly name for the website
- `url` (required) - Full URL to check (must include https:// or http://)
- `clientId` (optional) - Links website to a client; use `null` or omit for uncategorized sites

### Notification Settings

```json
{
  "notificationSettings": {
    "emailOnDown": true,
    "emailOnRecovery": false,
    "groupByClient": true
  }
}
```

**Options:**
- `emailOnDown` - Send email when a site goes down
- `emailOnRecovery` - Send email when a site comes back up
- `groupByClient` - Group alerts by client in email (recommended)

---

## 🧪 Local Testing

Create a `.env` file with your credentials:

```bash
cp .env.example .env
# Edit .env with your actual values
```

Run the test:

```bash
npm test
```

You'll see a JSON response with check results for all your websites.

---

## 🔧 Manual Trigger

You can manually trigger a check by visiting:

```
https://your-site-name.netlify.app/.netlify/functions/monitor
```

This is useful for testing after deployment.

## 📸 Website Snapshots

Capture and browse historical snapshots of your websites:

**Snapshot Viewer (Visual Interface):**
```
https://your-site-name.netlify.app/.netlify/functions/snapshot-viewer
```

**Capture a Snapshot (API):**
```
https://your-site-name.netlify.app/.netlify/functions/snapshot?action=capture&websiteId=my-site
```

**[📖 Full Snapshots Documentation](SNAPSHOTS.md)**

Features:
- 📸 Screenshot capture over time
- 📄 Simplified HTML archiving (no external assets)
- 🖼️ Beautiful visual interface
- 📊 Metadata tracking
- 🔍 Browse historical versions

Perfect for documenting changes, client reporting, and proving what your site looked like at any point in time!

---

## 📊 Response Format

The monitor returns a JSON response with detailed results:

```json
{
  "timestamp": "2024-03-18T17:00:00.000Z",
  "totalChecked": 4,
  "sitesUp": 3,
  "sitesDown": 1,
  "results": [...],
  "byClient": {
    "acme-corp": {
      "client": {...},
      "sites": [...]
    }
  },
  "alertSent": {
    "sent": true,
    "downSites": 1
  }
}
```

---

## 🌐 Alternative Deployment Options

### Vercel

```bash
npm install -g vercel
vercel
```

### AWS Lambda (via Serverless Framework)

```bash
npm install -g serverless
serverless deploy
```

---

## 💰 Cost

- **Netlify:** Free tier includes 125K function requests/month
- **SendGrid:** Free tier includes 100 emails/day
- **Total cost:** $0/month for most small businesses

With 5-minute intervals, you'll use ~8,640 checks/month - well within free limits!

---

## 🔮 Future Enhancements (Phase 3)

Phase 2 is complete! Here's what's next:

- 📊 **Dashboard UI** - Web interface for viewing history and stats
- 🌍 **Multi-region checks** - Test from different geographic locations
- 📱 **Mobile vs Desktop** - Compare mobile and desktop views
- 🔔 **More notification channels** - Slack, Discord, SMS, Webhook
- 💾 **Persistent storage** - Cloud storage for baselines (S3, Netlify Blobs)
- 📈 **Advanced analytics** - Uptime graphs, response time trends
- 🔄 **Recovery notifications** - Alert when sites come back online
- 🎯 **Performance monitoring** - Core Web Vitals, lighthouse scores

**Want something else? Open an issue on GitHub!**

---

## 🐛 Troubleshooting

### Emails not sending?

- ✅ Check that your SendGrid API key has **Mail Send** permissions
- ✅ Verify your `FROM_EMAIL` is verified in SendGrid settings
- ✅ Check Netlify function logs for errors
- ✅ Test manually by visiting the function URL

### Function not running?

- ✅ Check Netlify function logs in the dashboard
- ✅ Verify the cron schedule in `netlify.toml`
- ✅ Manually trigger the function to test
- ✅ Ensure environment variables are set correctly

### Sites showing as down but they're up?

- ✅ Check if the URL is correct (include https://)
- ✅ Verify the site doesn't block automated requests
- ✅ Check if the site has a long response time (timeout is 10 seconds)

---

## 📄 License

MIT License - feel free to use for your web development business!

## 👤 Author

**Jim O'Brien** - Web Development Business

---

## 🆘 Support

- 🐛 **Issues:** Open an issue on GitHub
- 📖 **Documentation:** Check this README
- 🔍 **Logs:** Check Netlify function logs for detailed error messages
- 💬 **Questions:** Open a discussion on GitHub

---

**Need help?** The Netlify function logs will show detailed error messages that can help diagnose any issues.

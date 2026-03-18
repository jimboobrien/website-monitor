# Website Status Monitor 🔍

A simple, free website uptime monitoring tool that checks your WordPress sites and sends email alerts via SendGrid when they're down.

## Features

- ✅ **Automated monitoring** - Checks websites every 5 minutes
- 📧 **Email alerts** - SendGrid integration for instant notifications
- 🆓 **Free deployment** - Runs on Netlify's free tier
- ⚡ **Fast** - Serverless functions for quick checks
- 📊 **Response tracking** - Monitors response times and status codes
- 🔧 **Easy configuration** - Simple JSON config file

## Phase 2 Roadmap (Future)

- 🎨 Visual comparison testing (PhantomJS/Puppeteer)
- 🎯 Custom checks (slider functionality, specific elements)
- 📈 Uptime statistics dashboard
- 💾 Historical data storage
- 🔔 Multiple notification channels (Slack, SMS, etc.)

## Setup

### 1. Clone this repository

\`\`\`bash
git clone https://github.com/jimboobrien/website-status-monitor.git
cd website-status-monitor
\`\`\`

### 2. Install dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Configure your websites

Edit `config.json` and add your websites:

\`\`\`json
{
  "websites": [
    {
      "name": "My WordPress Site",
      "url": "https://mywordpresssite.com"
    },
    {
      "name": "Client Site",
      "url": "https://clientsite.com"
    }
  ]
}
\`\`\`

### 4. Get SendGrid API Key

1. Sign up for a free SendGrid account: https://signup.sendgrid.com/
2. Go to Settings → API Keys
3. Create a new API key with "Mail Send" permissions
4. Copy the API key

### 5. Deploy to Netlify

#### Option A: Deploy via Netlify CLI

\`\`\`bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
\`\`\`

#### Option B: Deploy via GitHub (recommended)

1. Push this repo to your GitHub account
2. Go to https://app.netlify.com/
3. Click "Add new site" → "Import an existing project"
4. Connect your GitHub repo
5. Netlify will auto-detect the settings

### 6. Set environment variables in Netlify

In your Netlify dashboard:

1. Go to Site settings → Environment variables
2. Add these variables:
   - `SENDGRID_API_KEY` - Your SendGrid API key
   - `ALERT_EMAIL` - Email address to receive alerts
   - `FROM_EMAIL` - Verified sender email in SendGrid

### 7. Set up scheduled function

Netlify will automatically run your monitor function every 5 minutes based on the `netlify.toml` configuration.

## Local Testing

Create a `.env` file:

\`\`\`bash
cp .env.example .env
# Edit .env with your credentials
\`\`\`

Run the test:

\`\`\`bash
npm test
\`\`\`

## Manual Trigger

You can manually trigger a check by visiting:

\`\`\`
https://your-site.netlify.app/.netlify/functions/monitor
\`\`\`

## Configuration

### `config.json`

- **websites** - Array of websites to monitor
  - `name` - Friendly name for the website
  - `url` - Full URL to check
- **checkIntervalMinutes** - How often to check (default: 5)
- **notificationSettings** - Email preferences

## Alternative Deployment Options

### Vercel

\`\`\`bash
npm install -g vercel
vercel
\`\`\`

### AWS Lambda (via Serverless Framework)

\`\`\`bash
npm install -g serverless
serverless deploy
\`\`\`

## Cost

- **Netlify**: Free tier includes 125K function requests/month
- **SendGrid**: Free tier includes 100 emails/day
- **Total cost**: $0/month for most small businesses

## Troubleshooting

**Emails not sending?**
- Check that your SendGrid API key has "Mail Send" permissions
- Verify your FROM_EMAIL in SendGrid settings
- Check Netlify function logs for errors

**Function not running?**
- Check Netlify function logs in the dashboard
- Verify the cron schedule in `netlify.toml`
- Manually trigger the function to test

## License

MIT License - feel free to use for your web development business!

## Author

Jim O'Brien - Web Development Business

---

**Need help?** Open an issue on GitHub or check the Netlify function logs for detailed error messages.

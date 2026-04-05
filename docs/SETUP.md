# Quick Setup Instructions

## Step 1: Push to GitHub

Since you want this in your `jimboobrien` GitHub account, run these commands:

\`\`\`bash
# Navigate to the project
cd /root/.openclaw/workspace/website-status-monitor

# Add your GitHub repo as remote (create the repo on GitHub first)
git remote add origin https://github.com/jimboobrien/website-status-monitor.git

# Push to GitHub
git branch -M main
git push -u origin main
\`\`\`

**Or create the repo via GitHub CLI:**

\`\`\`bash
gh repo create jimboobrien/website-status-monitor --public --source=. --remote=origin --push
\`\`\`

## Step 2: Get SendGrid API Key

1. Sign up: https://signup.sendgrid.com/ (FREE - 100 emails/day)
2. Navigate to: Settings → API Keys
3. Click "Create API Key"
4. Select "Restricted Access" and enable "Mail Send"
5. Copy the API key (you won't see it again!)

## Step 3: Deploy to Netlify

### Option A: Via Netlify Dashboard (Easiest)

1. Go to https://app.netlify.com/
2. Click "Add new site" → "Import an existing project"
3. Choose "GitHub" and authorize
4. Select your `website-status-monitor` repository
5. Netlify auto-detects settings - just click "Deploy"
6. After deployment, go to:
   - Site settings → Environment variables → Add:
     - `SENDGRID_API_KEY` = (your SendGrid API key)
     - `ALERT_EMAIL` = (your email)
     - `FROM_EMAIL` = (verified sender email in SendGrid)

### Option B: Via Netlify CLI

\`\`\`bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
\`\`\`

## Step 4: Configure Your Websites

Edit `config.json`:

\`\`\`json
{
  "websites": [
    {
      "name": "My Main Site",
      "url": "https://yoursite.com"
    },
    {
      "name": "Client Site 1",
      "url": "https://client1.com"
    }
  ]
}
\`\`\`

Commit and push changes:

\`\`\`bash
git add config.json
git commit -m "Add my websites"
git push
\`\`\`

Netlify will auto-deploy the update!

## Step 5: Test It

Visit your function URL:
\`\`\`
https://your-site-name.netlify.app/.netlify/functions/monitor
\`\`\`

You should see a JSON response with check results.

## Monitoring Schedule

The function runs automatically every 5 minutes. You can adjust this in `netlify.toml`.

---

**That's it!** Your monitor is now running 24/7 for FREE. 🎉

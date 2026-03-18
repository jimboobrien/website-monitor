#!/bin/bash
# Run these commands to push to your GitHub repo

cd /root/.openclaw/workspace/website-status-monitor

# Add the remote
git remote add origin https://github.com/jimboobrien/website-monitor.git

# Rename branch to main
git branch -M main

# Push to GitHub
git push -u origin main

echo "✅ Pushed to GitHub!"
echo "Next: Deploy to Netlify at https://app.netlify.com/"

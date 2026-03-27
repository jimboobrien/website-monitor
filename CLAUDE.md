# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install              # Install dependencies
npm test                 # Test basic monitor (runs test-local.js)
npm run test:enhanced    # Test Phase 2 enhanced monitor (runs test-enhanced.js)
npm run dev              # Local dev server via netlify-cli
netlify deploy --prod    # Deploy to Netlify
```

Tests are plain Node scripts (test-local.js, test-enhanced.js) that simulate Netlify function invocations — no test framework is used. They require a `.env` file with SENDGRID_API_KEY, ALERT_EMAIL, and FROM_EMAIL.

## Architecture

This is a serverless website monitoring system deployed as Netlify scheduled functions. It checks website uptime, takes screenshots for visual comparison, and sends email alerts via SendGrid.

**Two monitoring tiers:**

- **Phase 1** (`netlify/functions/monitor.js`) — HTTP uptime checks, response time tracking, email alerts. Runs every 5 minutes via Netlify cron.
- **Phase 2** (`netlify/functions/monitor-enhanced.js`) — Adds visual screenshot comparison (pixelmatch) and 7 custom element check types via headless Chrome (puppeteer-core + @sparticuz/chromium). Phase 2 features are opt-in per website in config.json.

**Shared libraries in `netlify/functions/lib/`:**

- `visual-check.js` — Puppeteer screenshot capture + pixelmatch comparison against baselines
- `custom-checks.js` — 7 check types (element-exists, text-contains, slider-working, form-submits, link-clickable, image-loaded, custom-script), all browser-automated
- `storage.js` — File-based persistence in `/tmp/website-monitor/` (baselines, history)
- `snapshot.js` — Website archiving (screenshot + HTML + metadata), organized by websiteId/timestamp

**Snapshot endpoints:**

- `netlify/functions/snapshot.js` — API for capture/list/view actions
- `netlify/functions/snapshot-viewer.js` — HTML UI for browsing snapshots

**Configuration:** `config.json` defines clients, websites (with optional visualCheck/customChecks/snapshot settings), check intervals, and notification preferences. See `config.example.json` for structure.

**Storage:** All data goes to `/tmp/website-monitor/` (baselines/, history/, snapshots/). This persists within a single function execution but not across Netlify deploys.

**Alert flow:** Monitor checks sites -> groups results by client -> generates HTML email -> sends via SendGrid. Alerts trigger on: site down, visual change above threshold, or custom check failure.

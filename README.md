# Website Status Monitor

A serverless website monitoring system deployed as Netlify functions, backed by Supabase. It checks website uptime, tracks response times, takes screenshots for visual comparison, and sends email alerts via SendGrid.

## Monitor Functions

### `monitor.js` — Basic HTTP Monitor

**URL:** `/.netlify/functions/monitor`
**Schedule:** Every 5 minutes (`*/5 * * * *` via `@netlify/functions` schedule)

Performs a simple HTTP GET request against every enabled website in Supabase and records the result.

**What it does on each run:**

1. Loads all enabled websites and clients from Supabase
2. Sends an HTTP GET to each website URL (10s timeout)
3. Records the HTTP status code, response time, and up/down status
4. Saves each check result to the `monitor_checks` table in Supabase
5. Creates an incident in the `incidents` table if a site is newly down
6. Auto-resolves open incidents when a site recovers
7. Sends an email alert via SendGrid if any sites are down (grouped by client)
8. Logs sent alerts to the `alert_history` table

**Response:** Returns JSON with all check results, grouped by client, plus alert status.

---

### `monitor-enhanced.js` — Enhanced Monitor (Visual + Custom Checks)

**URL:** `/.netlify/functions/monitor-enhanced`
**Schedule:** Once daily at 6:00 AM UTC (`0 6 * * *` via `@netlify/functions` schedule)

Does everything the basic monitor does, plus visual screenshot comparison and custom element checks for sites that have those features enabled.

**What it does on each run:**

1. Loads all enabled websites and clients from Supabase
2. Sends an HTTP GET to each website URL (10s timeout)
3. For sites that are up and have `visual_check_enabled`:
   - Fetches the baseline screenshot from Supabase Storage
   - Takes a new screenshot via headless Chrome (puppeteer-core + @sparticuz/chromium)
   - Compares screenshots using pixelmatch to detect visual changes
   - If no baseline exists, saves the current screenshot as the new baseline
   - Uploads the check screenshot to Supabase Storage
4. For sites that are up and have `custom_checks` configured, runs browser-automated checks:
   - `element-exists` — verify a CSS selector is present
   - `text-contains` — check for specific text on the page
   - `slider-working` — verify a slider/carousel is functional
   - `form-submits` — test form submission behavior
   - `link-clickable` — verify a link is clickable and responds
   - `image-loaded` — check that images load correctly
   - `custom-script` — run arbitrary JavaScript assertions
5. Saves each check result to `monitor_checks` with enhanced metadata (visual diff %, custom check pass/fail counts) in the `metadata` JSONB column
6. Creates incidents for down sites or sites with visual/custom check failures
7. Auto-resolves open incidents when issues clear
8. Sends email alerts for any issues (down, visual changes, or custom check failures), grouped by client
9. Logs sent alerts to the `alert_history` table

**Response:** Returns JSON with all results, stats summary (sites up/down, visual changes, custom check failures), and alert status.

---

### `check-now.js` — On-Demand Check

**URL:** `/.netlify/functions/check-now`
**Schedule:** None (on-demand only, triggered from dashboard UI)

A lightweight endpoint for triggering checks without the enhanced features (no screenshots or custom checks). Used by the dashboard "Check Now" and "Check All Sites" buttons.

- `?id=website-id` — check a single site
- `?all=true` — check all sites

Saves results to `monitor_checks` and handles incident creation/resolution, same as the other monitors.

## Intervals Summary

| Function | Interval | Trigger |
|---|---|---|
| `monitor.js` | Every 5 minutes | Netlify scheduled function (`*/5 * * * *`) |
| `monitor-enhanced.js` | Daily at 6:00 AM UTC | Netlify scheduled function (`0 6 * * *`) |
| `check-now.js` | Manual | Dashboard UI buttons or direct URL |

## Other Endpoints

| Endpoint | Purpose |
|---|---|
| `/.netlify/functions/dashboard-data` | Dashboard API (overview, monitors, charts) |
| `/.netlify/functions/clients` | Client CRUD (list, create, update with colors) |
| `/.netlify/functions/snapshot` | Capture/list/view website snapshots |
| `/.netlify/functions/snapshot-viewer` | HTML UI for browsing snapshots |

## Tech Stack

- **Runtime:** Netlify Functions (Node.js)
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage (screenshots, baselines)
- **Email:** SendGrid
- **Browser automation:** puppeteer-core + @sparticuz/chromium
- **Frontend:** React 18, Tailwind CSS, Recharts (all via CDN)

## Setup

```bash
npm install
cp .env.example .env  # Add your Supabase and SendGrid credentials
npm run dev            # Local dev server via netlify-cli
```

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `SENDGRID_API_KEY`
- `ALERT_EMAIL`
- `FROM_EMAIL`

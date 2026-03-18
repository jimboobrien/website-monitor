# 📸 Website Snapshots - Your Own Wayback Machine

Capture and preserve historical versions of your websites with screenshots and simplified HTML.

## What It Does

The snapshot feature lets you:
- 📸 **Take screenshots** of websites over time
- 📄 **Save simplified HTML** (without external CSS/JS/images)
- 🔍 **Browse historical versions** with a visual interface
- 📊 **View metadata** (title, viewport, URL)
- 🎯 **Compare versions** (manually via viewer)
- 🗑️ **Auto-cleanup** old snapshots

**Perfect for:**
- Documenting site changes before/after updates
- Proving what a site looked like at a specific time
- Catching design regressions
- Client reporting (show before/after)
- Archiving important pages

---

## Quick Start

### 1. Take a Manual Snapshot

Visit this URL (replace YOUR-SITE and my-site):
```
https://YOUR-SITE.netlify.app/.netlify/functions/snapshot?action=capture&websiteId=my-site
```

The `websiteId` should match the `id` field in your `config.json`, or the site name (lowercase, dashes instead of spaces).

### 2. View Your Snapshots

Open the visual viewer:
```
https://YOUR-SITE.netlify.app/.netlify/functions/snapshot-viewer
```

You'll see:
- List of all monitored websites
- Historical snapshots for each site
- Links to view screenshots and HTML

### 3. Enable Auto-Snapshots (Optional)

Add to your `config.json`:

```json
{
  "id": "my-site",
  "name": "My WordPress Site",
  "url": "https://mysite.com",
  "snapshot": {
    "enabled": true,
    "frequency": "daily",
    "keepCount": 30
  }
}
```

**Options:**
- `enabled` - Turn auto-snapshots on/off
- `frequency` - How often to capture (`"daily"`, `"weekly"`, `"on-change"`)
- `keepCount` - Max snapshots to keep (default: 10, older ones deleted automatically)

---

## API Reference

### Capture a Snapshot

**Endpoint:** `GET /.netlify/functions/snapshot`

**Parameters:**
- `action=capture` (required)
- `websiteId=YOUR_ID` (required)

**Example:**
```
/.netlify/functions/snapshot?action=capture&websiteId=my-site
```

**Response:**
```json
{
  "success": true,
  "action": "capture",
  "websiteId": "my-site",
  "websiteName": "My WordPress Site",
  "timestamp": "2024-03-18T17:30:00.000Z",
  "metadata": {
    "title": "My Site Homepage",
    "description": "Welcome to my site",
    "viewport": { "width": 1280, "height": 720 }
  },
  "htmlSize": 45230
}
```

### List All Snapshots

**Endpoint:** `GET /.netlify/functions/snapshot`

**Parameters:**
- `action=list` (required)
- `websiteId=YOUR_ID` (optional - omit to list all websites)

**Example:**
```
/.netlify/functions/snapshot?action=list&websiteId=my-site
```

**Response:**
```json
{
  "success": true,
  "action": "list",
  "websiteId": "my-site",
  "count": 5,
  "snapshots": [
    {
      "timestamp": 1710782400000,
      "date": "2024-03-18T17:30:00.000Z",
      "url": "https://mysite.com",
      "title": "My Site Homepage",
      "hasScreenshot": true,
      "hasHTML": true
    }
  ]
}
```

### View a Snapshot

**Endpoint:** `GET /.netlify/functions/snapshot`

**Parameters:**
- `action=view` (required)
- `websiteId=YOUR_ID` (required)
- `timestamp=UNIX_MS` (required)
- `format=json|html|png` (optional, default: json)

**Examples:**

View metadata:
```
/.netlify/functions/snapshot?action=view&websiteId=my-site&timestamp=1710782400000
```

View screenshot:
```
/.netlify/functions/snapshot?action=view&websiteId=my-site&timestamp=1710782400000&format=png
```

View HTML:
```
/.netlify/functions/snapshot?action=view&websiteId=my-site&timestamp=1710782400000&format=html
```

---

## Visual Viewer

The snapshot viewer provides a beautiful interface for browsing snapshots.

**URL:** `/.netlify/functions/snapshot-viewer`

### Features:
- 🖼️ Grid view of all monitored websites
- 📅 Timeline of snapshots per site
- 🔗 Quick links to view screenshots, HTML, or metadata
- 📱 Responsive design (works on mobile)
- 🎨 Beautiful gradient UI

### Usage:

1. Open the viewer URL
2. Click on a website
3. Browse historical snapshots
4. Click buttons to view:
   - **📸 View Screenshot** - Opens full-size PNG
   - **📄 View HTML** - Opens simplified HTML version
   - **📊 Metadata** - Shows JSON details

---

## What Gets Captured?

### Screenshot
- Full-page PNG (by default)
- Configurable viewport size (default: 1280x720)
- Captured after page fully loads

### Simplified HTML
The HTML is stripped of:
- ❌ External JavaScript files
- ❌ External CSS files (inline styles kept)
- ❌ External images (replaced with placeholders)
- ❌ Iframes (replaced with placeholders)

What remains:
- ✅ Page structure (HTML)
- ✅ Inline styles
- ✅ Text content
- ✅ Links (URLs preserved)
- ✅ Layout structure

**Why simplified?**
- Keeps file size small
- No external dependencies (self-contained)
- Loads instantly
- Focuses on content and structure

### Metadata
Captured data:
- Page title
- Meta description
- Viewport dimensions
- Full URL
- Timestamp
- File sizes

---

## Storage

Snapshots are stored in `/tmp/website-monitor/snapshots/` with this structure:

```
/tmp/website-monitor/snapshots/
├── my-site/
│   ├── 1710782400000.json        # Metadata
│   ├── 1710782400000.png         # Screenshot
│   ├── 1710782400000.html        # Simplified HTML
│   ├── 1710868800000.json
│   ├── 1710868800000.png
│   └── 1710868800000.html
└── another-site/
    └── ...
```

**⚠️ Important Notes:**

### Netlify /tmp Storage
- ✅ Persists during function warm starts
- ❌ Cleared when function goes cold (every ~15 minutes of inactivity)
- ✅ Good for temporary storage
- ❌ Not suitable for long-term archiving

### For Production Use

Consider upgrading to persistent storage:

**Option 1: Netlify Blobs** (recommended)
```bash
npm install @netlify/blobs
```

**Option 2: AWS S3**
```bash
npm install aws-sdk
```

**Option 3: Cloudflare R2**
```bash
npm install @cloudflare/workers-types
```

I can help you implement persistent storage if needed!

---

## Automation Examples

### Schedule Daily Snapshots

Create a cron job to capture snapshots:

```json
{
  "name": "Daily Snapshot Job",
  "schedule": {
    "kind": "cron",
    "expr": "0 2 * * *",
    "tz": "America/New_York"
  },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "Take snapshots of all websites in config.json"
  }
}
```

### Snapshot Before Updates

Capture a snapshot manually before deploying:

```bash
# Via command line
curl "https://your-site.netlify.app/.netlify/functions/snapshot?action=capture&websiteId=my-site"
```

### Weekly Archive

Keep weekly snapshots forever, daily for 7 days:

```json
{
  "id": "important-site",
  "name": "Important Client Site",
  "url": "https://important.com",
  "snapshot": {
    "enabled": true,
    "frequency": "daily",
    "keepDaily": 7,
    "keepWeekly": 52
  }
}
```

---

## Use Cases

### Web Agency
- **Before/After Documentation** - Prove improvements to clients
- **Change Tracking** - Show what changed when
- **Client Disputes** - Have proof of site state
- **Migration Records** - Document old site before redesign

### E-commerce
- **Product Page Changes** - Track pricing and description changes
- **Seasonal Updates** - Archive holiday themes
- **A/B Testing Records** - Document different versions
- **Compliance** - Prove terms/pricing at specific dates

### Personal Projects
- **Portfolio History** - Watch your site evolve
- **Experiment Documentation** - Record different designs
- **Learning Progress** - See improvement over time
- **Bug Reports** - Show what broke when

---

## Comparison with Wayback Machine

| Feature | Website Monitor Snapshots | Wayback Machine |
|---------|---------------------------|-----------------|
| **Cost** | Free (Netlify tier) | Free |
| **Speed** | Instant | Slow (can take hours) |
| **Control** | Full control over when | No control |
| **Storage** | Your infra | Archive.org |
| **Privacy** | Private snapshots | Public archive |
| **Retention** | You decide | Forever (but unreliable) |
| **Frequency** | As often as you want | Varies |
| **HTML Quality** | Simplified (no assets) | Full with assets |

**Best of both worlds:** Use this for frequent, private snapshots. Use Wayback Machine for long-term public archiving.

---

## Advanced Configuration

### Custom Viewport Sizes

Capture mobile vs desktop:

```javascript
// Mobile snapshot
takeSnapshot('https://mysite.com', {
  width: 375,
  height: 667
});

// Desktop snapshot
takeSnapshot('https://mysite.com', {
  width: 1920,
  height: 1080
});
```

### Screenshot Only (No HTML)

Save storage space:

```javascript
takeSnapshot('https://mysite.com', {
  captureScreenshot: true,
  captureHTML: false
});
```

### Wait for Specific Element

Ensure content loads first:

```javascript
takeSnapshot('https://mysite.com', {
  waitForSelector: '.main-content',
  timeout: 30000
});
```

---

## Troubleshooting

### "Snapshot not found"
- Check the `websiteId` matches your config
- Verify snapshots exist with `action=list`
- Snapshots may be cleared if function went cold

### "Function timeout"
- Reduce number of simultaneous snapshots
- Increase viewport size gradually
- Check site loads quickly

### "Storage full"
- Clean up old snapshots manually
- Enable auto-cleanup with `keepCount`
- Consider upgrading to cloud storage

### Screenshots look broken
- Try adding `waitForSelector`
- Increase timeout
- Check if site requires auth

---

## Next Steps

**Want to upgrade storage?** I can help implement:
- Netlify Blobs for persistent storage
- AWS S3 for large-scale archiving
- CloudFlare R2 for cheap object storage

**Want more features?** Ask for:
- Side-by-side comparison view
- Diff highlighting between snapshots
- Mobile vs desktop captures
- Scheduled snapshot jobs
- Email reports with snapshots

---

**Ready to start capturing?** Just visit your snapshot function URL! 📸

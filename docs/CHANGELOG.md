# Changelog

All notable changes to Website Status Monitor.

## [2.0.0] - 2024-03-18 🚀 Phase 2 Release

### Added - Phase 2 Features

#### Visual Comparison Testing 🎨
- Screenshot capture with Puppeteer
- Baseline creation and storage
- Pixel-by-pixel image comparison using pixelmatch
- Configurable sensitivity threshold (1-10%+)
- Full-page or viewport screenshots
- Smart waiting for specific elements
- Visual change percentage in alerts

#### Custom Element Checks 🎯
- **7 check types available:**
  1. `element-exists` - Verify element presence
  2. `text-contains` - Check for specific text
  3. `slider-working` - Validate carousels/sliders
  4. `form-submits` - Ensure forms have submit buttons
  5. `link-clickable` - Check button/link clickability
  6. `image-loaded` - Verify image loading
  7. `custom-script` - Run custom JavaScript

#### Website Snapshots 📸
- Capture historical screenshots over time
- Save simplified HTML (no external assets)
- Visual interface for browsing snapshots
- API for capture, list, and view operations
- Metadata tracking (title, viewport, URL, timestamp)
- Auto-cleanup of old snapshots
- Mobile-friendly snapshot viewer UI

### Files Added

**Phase 2 Core:**
- `netlify/functions/monitor-enhanced.js` - Enhanced monitoring function
- `netlify/functions/lib/visual-check.js` - Visual comparison logic
- `netlify/functions/lib/custom-checks.js` - Element validation (7 types)
- `netlify/functions/lib/storage.js` - History and baseline storage

**Snapshots:**
- `netlify/functions/snapshot.js` - Snapshot API
- `netlify/functions/snapshot-viewer.js` - Visual HTML interface
- `netlify/functions/lib/snapshot.js` - Core snapshot logic

**Documentation:**
- `PHASE2.md` - Complete Phase 2 guide
- `SNAPSHOTS.md` - Snapshot feature documentation
- `UPGRADE.md` - Migration guide from Phase 1
- `FEATURES.md` - Comprehensive feature list
- `config-phase2.example.json` - Example configuration
- `test-enhanced.js` - Local testing script

### Changed
- Updated `README.md` with Phase 2 and Snapshots sections
- Bumped version to 2.0.0 in `package.json`
- Enhanced email alerts with issue categorization
- Improved HTML formatting in alerts

### Technical Changes
- Added `puppeteer-core` for headless browser automation
- Added `@sparticuz/chromium` for Netlify compatibility
- Added `pixelmatch` for image comparison
- Added `pngjs` for PNG processing
- Modular code structure with `lib/` directory
- Backward compatible with Phase 1 config

---

## [1.0.0] - 2024-03-18 - Initial Release

### Added - Phase 1 Features

#### Core Monitoring
- HTTP uptime checking (200-299 status codes)
- Response time tracking
- Configurable check interval (default: 5 minutes)
- Simple JSON configuration
- Environment variable support

#### Client Management 👥
- Group websites by client
- Client metadata (name, email, notes)
- Grouped email alerts by client
- Client-based reporting

#### Email Alerts 📧
- SendGrid integration
- HTML formatted emails
- Client grouping in alerts
- Detailed error messages
- Response time information
- Status codes and timestamps

#### Deployment
- Netlify Functions support
- Serverless architecture
- Auto-deploy from GitHub
- Free tier compatible
- Scheduled function execution

### Files Added
- `netlify/functions/monitor.js` - Basic monitoring function
- `config.json` - Configuration file
- `config.example.json` - Example configuration
- `package.json` - Dependencies and scripts
- `netlify.toml` - Netlify configuration
- `README.md` - Main documentation
- `SETUP.md` - Quick setup guide
- `test-local.js` - Local testing script
- `.env.example` - Environment variables template
- `.gitignore` - Git ignore rules

---

## Roadmap

### Phase 3 (Future)
- 📊 Web dashboard for viewing history
- 🌍 Multi-region checks (test from different locations)
- 📱 Mobile vs desktop visual comparison
- 🔔 Slack, Discord, SMS notifications
- 💾 Persistent cloud storage (Netlify Blobs, S3, R2)
- 📈 Graphs and analytics dashboard
- 🔄 Recovery notifications (when site comes back up)
- 🎯 Performance monitoring (Core Web Vitals, Lighthouse scores)
- 🤖 Auto-remediation actions
- 📸 Screenshot history viewer with timeline
- 🔍 SEO checks (meta tags, sitemap, robots.txt)
- 🔒 SSL certificate monitoring
- 📄 PDF report generation

### Potential Additions
- Integration with status page services
- WordPress plugin for easier setup
- Docker image for self-hosting
- Browser extension for quick access
- Mobile app (iOS/Android)
- Webhook notifications
- Custom notification rules
- Team collaboration features
- Role-based access control
- API rate limiting and auth

---

## Upgrade Guides

- **Phase 1 → Phase 2:** See [UPGRADE.md](UPGRADE.md)
- **Adding Snapshots:** See [SNAPSHOTS.md](SNAPSHOTS.md)

---

## Breaking Changes

None - All updates are backward compatible!

---

## Support

- 📖 Documentation: See README.md and feature-specific docs
- 🐛 Report issues: GitHub Issues
- 💬 Questions: GitHub Discussions
- ⭐ Star the repo if you find it useful!

---

**Repository:** https://github.com/jimboobrien/website-monitor

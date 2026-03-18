# 🚀 Phase 2: Advanced Monitoring Features

Phase 2 adds powerful visual comparison testing and custom element checking to catch issues that basic uptime monitoring misses.

## ✨ New Features

### 🎨 Visual Comparison Testing

Automatically take screenshots and detect visual changes to your websites. Perfect for catching:
- Layout breaks
- Missing content
- Design regressions
- CSS issues
- Broken images in complex layouts

### 🎯 Custom Element Checks

Verify specific functionality on your WordPress sites:
- **Slider functionality** - Check if carousels/sliders are working
- **Form validation** - Ensure contact forms exist and have submit buttons
- **Element existence** - Verify critical elements are present
- **Image loading** - Check if images loaded properly
- **Link functionality** - Ensure buttons/links are clickable
- **Text content** - Verify specific text appears on the page
- **Custom scripts** - Run your own JavaScript for advanced checks

### 💾 Historical Data

Track uptime history and trends over time (stored in `/tmp` on Netlify - persists during function executions).

---

## 📋 Configuration Guide

### Visual Checks

Add `visualCheck` to any website in your `config.json`:

```json
{
  "id": "my-site",
  "name": "My WordPress Site",
  "url": "https://mysite.com",
  "visualCheck": {
    "enabled": true,
    "threshold": 5.0,
    "fullPage": false,
    "waitForSelector": ".main-content"
  }
}
```

**Options:**
- `enabled` (boolean) - Turn visual checking on/off
- `threshold` (number) - Percentage difference to trigger alert (default: 5.0)
  - `1.0` = very sensitive (1% change triggers alert)
  - `5.0` = balanced (good for most sites)
  - `10.0` = less sensitive (only major changes)
- `fullPage` (boolean) - Capture full page or just viewport (default: false)
- `waitForSelector` (string) - Wait for element before taking screenshot (optional)

**How it works:**
1. First run creates a baseline screenshot
2. Subsequent runs compare against the baseline
3. Alert sent if difference exceeds threshold
4. Baseline persists until you manually update it

### Custom Checks

Add `customChecks` array to any website:

```json
{
  "customChecks": [
    {
      "name": "Hero Slider Check",
      "type": "slider-working",
      "selector": ".hero-slider",
      "slideCount": 3
    },
    {
      "name": "Contact Form Exists",
      "type": "form-submits",
      "selector": "#contact-form"
    }
  ]
}
```

#### Available Check Types

##### 1. `element-exists`
Check if an element is present on the page.

```json
{
  "name": "Check Logo Exists",
  "type": "element-exists",
  "selector": ".site-logo"
}
```

##### 2. `text-contains`
Verify specific text appears in an element.

```json
{
  "name": "Price Display",
  "type": "text-contains",
  "selector": ".product-price",
  "text": "$"
}
```

##### 3. `slider-working`
Check if a slider/carousel exists and has slides.

```json
{
  "name": "Product Slider",
  "type": "slider-working",
  "selector": ".product-carousel",
  "slideCount": 5
}
```

**Options:**
- `selector` - CSS selector for the slider container
- `slideCount` (optional) - Minimum number of slides expected

##### 4. `form-submits`
Verify a form exists and has a submit button.

```json
{
  "name": "Contact Form",
  "type": "form-submits",
  "selector": "#contact-form"
}
```

##### 5. `link-clickable`
Check if a link/button is clickable (visible and not disabled).

```json
{
  "name": "Cart Button",
  "type": "link-clickable",
  "selector": ".add-to-cart"
}
```

##### 6. `image-loaded`
Verify an image loaded successfully.

```json
{
  "name": "Hero Image",
  "type": "image-loaded",
  "selector": ".hero-image img"
}
```

##### 7. `custom-script`
Run custom JavaScript on the page (advanced).

```json
{
  "name": "Product Count Check",
  "type": "custom-script",
  "script": "return document.querySelectorAll('.product').length >= 10"
}
```

The script should return `true` for pass, `false` for fail.

---

## 🔧 Deployment

### Using the Enhanced Monitor

You have two options:

#### Option 1: Replace the existing monitor (recommended)

```bash
cd netlify/functions
mv monitor.js monitor-basic.js
mv monitor-enhanced.js monitor.js
```

Then push to GitHub - Netlify will auto-deploy.

#### Option 2: Create a separate function

Keep both functions and call `/monitor-enhanced` for Phase 2 features:

```
https://your-site.netlify.app/.netlify/functions/monitor-enhanced
```

Update `netlify.toml` to schedule the enhanced version:

```toml
[[plugins]]
  package = "@netlify/plugin-functions-cron"

[functions."monitor-enhanced"]
  schedule = "*/5 * * * *"
```

### Update Your Config

1. Copy `config-phase2.example.json` to `config.json`
2. Customize with your websites
3. Add visual checks and custom checks as needed
4. Push to GitHub

---

## 📊 Response Format

The enhanced monitor returns additional data:

```json
{
  "version": "2.0-phase2",
  "timestamp": "2024-03-18T17:00:00.000Z",
  "stats": {
    "totalChecked": 5,
    "sitesUp": 5,
    "sitesDown": 0,
    "visualChanges": 1,
    "customChecksFailed": 2
  },
  "results": [
    {
      "name": "My WordPress Site",
      "url": "https://mysite.com",
      "isUp": true,
      "responseTime": 452,
      "enhanced": {
        "visual": {
          "success": true,
          "hasChanged": true,
          "diffPercentage": "6.24",
          "threshold": 5.0
        },
        "custom": {
          "success": true,
          "results": [
            {
              "checkName": "Hero Slider",
              "checkType": "slider-working",
              "passed": true,
              "message": "Slider working with 3 slides"
            },
            {
              "checkName": "Contact Form",
              "checkType": "form-submits",
              "passed": false,
              "message": "Form found but no submit button"
            }
          ]
        }
      }
    }
  ]
}
```

---

## 📧 Enhanced Email Alerts

Alerts now include:

- **🔴 Down** - Site is unreachable
- **🎨 Visual Changes** - Layout/design changes detected
- **🎯 Custom Check Failed** - Slider, form, or element check failed

Grouped by client for easy management!

---

## ⚠️ Important Notes

### Resource Usage

Visual checks and custom checks use more resources:
- Puppeteer launches a headless Chrome instance
- Screenshots use memory
- Custom checks take longer

**Recommendations:**
- Don't enable visual checks on ALL sites
- Use visual checks for critical/complex pages
- Keep custom check count reasonable (5-10 per site)

### Netlify Function Limits

Free tier:
- 125K function invocations/month
- 10 second timeout per invocation

Phase 2 features may take 5-15 seconds per site. With 10 sites:
- Basic monitoring: ~1 second total
- Enhanced monitoring: ~30-60 seconds total

**Solution:** 
- Use enhanced monitoring for critical sites
- Use basic monitoring for simple sites
- Or upgrade to Pro for longer timeouts

### Baseline Management

Baselines are stored in `/tmp` which:
- ✅ Persists during function warm starts
- ❌ Resets if function goes cold

For production, consider:
- Netlify Blobs (built-in storage)
- AWS S3
- CloudFlare R2

I can help implement this if needed!

---

## 🐛 Troubleshooting

### Visual checks timing out?

Reduce the number of sites with visual checks or increase timeout:

```json
{
  "visualCheck": {
    "enabled": true,
    "timeout": 15000
  }
}
```

### Screenshots look broken?

Try waiting for a specific element first:

```json
{
  "visualCheck": {
    "enabled": true,
    "waitForSelector": ".main-content"
  }
}
```

### Custom checks failing unexpectedly?

Check the selector is correct:
1. Visit the website
2. Open DevTools (F12)
3. Use the element selector to verify the CSS selector
4. Test in Console: `document.querySelector('.your-selector')`

---

## 🔮 Future Enhancements

- 📊 Dashboard UI for viewing history
- 🌍 Multi-region checks (test from different locations)
- 📱 Mobile vs Desktop visual comparison
- 🔔 Slack/Discord notifications
- 💾 Persistent storage for baselines
- 📈 Uptime graphs and analytics

Want any of these? Let me know!

---

## 💡 Example Use Cases

### WordPress Agency

Monitor client sites for:
- Theme updates breaking layout (visual check)
- Slider plugins failing (custom check)
- Contact forms broken (custom check)
- WooCommerce cart issues (custom check)

### E-commerce Site

- Product images loading (image check)
- Add to cart working (element + link check)
- Price display correct (text check)
- Checkout button exists (element check)
- Homepage slider working (slider check)

### Corporate Website

- Hero image loaded (image check)
- Navigation menu present (element check)
- Contact form functional (form check)
- Newsletter signup working (form check)
- Visual regression after updates (visual check)

---

**Ready to deploy Phase 2?** Follow the deployment steps above or ask me for help!

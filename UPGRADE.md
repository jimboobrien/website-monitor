# Upgrading to Phase 2

This guide helps you upgrade from basic monitoring (Phase 1) to advanced monitoring (Phase 2).

## What's Changed?

### New Features ✨
- Visual comparison testing with Puppeteer
- Custom element checks (sliders, forms, images, links)
- Historical data tracking
- Enhanced email alerts with issue categorization

### Backward Compatible ✅
- Your existing `config.json` still works
- Phase 1 basic monitoring continues to function
- No breaking changes to the config format

---

## Upgrade Steps

### 1. Pull Latest Code

```bash
cd website-status-monitor
git pull origin main
npm install
```

This installs the new dependencies:
- `puppeteer-core` - Headless Chrome automation
- `@sparticuz/chromium` - Chrome for Netlify
- `pixelmatch` - Image comparison
- `pngjs` - PNG image handling

### 2. Choose Your Approach

#### Option A: Gradual Migration (Recommended)

Keep both monitors running and migrate sites gradually:

1. **Keep the basic monitor as is** - it will continue checking all sites
2. **Add Phase 2 features to specific sites** in your config
3. **Deploy `monitor-enhanced` as a separate function**

Update `netlify.toml`:

```toml
[build]
  functions = "netlify/functions"

[functions]
  # Basic monitor runs every 5 minutes for all sites
  # Enhanced monitor runs every 10 minutes for sites with Phase 2 features

[[plugins]]
  package = "@netlify/plugin-functions-cron"

[functions."monitor"]
  schedule = "*/5 * * * *"

[functions."monitor-enhanced"]
  schedule = "*/10 * * * *"
```

#### Option B: Full Migration

Replace the basic monitor entirely:

```bash
cd netlify/functions
mv monitor.js monitor-basic.js
mv monitor-enhanced.js monitor.js
git add -A
git commit -m "Upgrade to Phase 2 monitoring"
git push origin main
```

### 3. Update Your Config

Add Phase 2 features to websites that need them:

**Before (Phase 1):**
```json
{
  "name": "My WordPress Site",
  "url": "https://mysite.com",
  "clientId": "my-client"
}
```

**After (Phase 2):**
```json
{
  "id": "my-site",
  "name": "My WordPress Site",
  "url": "https://mysite.com",
  "clientId": "my-client",
  "visualCheck": {
    "enabled": true,
    "threshold": 5.0
  },
  "customChecks": [
    {
      "name": "Hero Slider",
      "type": "slider-working",
      "selector": ".hero-slider"
    },
    {
      "name": "Contact Form",
      "type": "form-submits",
      "selector": "#contact-form"
    }
  ]
}
```

**New fields:**
- `id` - (Optional but recommended) Unique identifier for historical tracking
- `visualCheck` - Visual comparison settings
- `customChecks` - Array of custom element checks

### 4. Test Locally

```bash
# Test basic monitoring
npm test

# Test enhanced monitoring
npm run test:enhanced
```

The enhanced test will take longer (launching Chrome).

### 5. Deploy

```bash
git add -A
git commit -m "Enable Phase 2 features for critical sites"
git push origin main
```

Netlify will auto-deploy within 1-2 minutes.

### 6. Verify

Visit your function URL:
```
https://your-site.netlify.app/.netlify/functions/monitor-enhanced
```

Check the response for:
- `"version": "2.0-phase2"`
- `stats.visualChanges`
- `stats.customChecksFailed`
- `enhanced` object in results

---

## Migration Tips

### Start Small

Don't enable Phase 2 features on all sites at once:

1. **Week 1:** Add visual checks to 1-2 critical sites
2. **Week 2:** Add custom checks to WordPress sites with sliders/forms
3. **Week 3:** Expand to remaining sites as needed

### Monitor Function Duration

Phase 2 checks take longer:
- Basic check: ~500ms per site
- Visual check: ~3-5 seconds per site
- Custom checks: ~2-4 seconds per site

**Netlify free tier timeout: 10 seconds**

If you have 10+ sites with Phase 2 features, consider:
- Running checks less frequently (every 10 minutes instead of 5)
- Splitting into multiple functions by client
- Upgrading to Netlify Pro (26-second timeout)

### Visual Check Best Practices

**Good candidates for visual checks:**
- Homepage (layout is critical)
- Landing pages (design matters)
- E-commerce product pages
- Sites you frequently update

**Skip visual checks for:**
- Admin dashboards (constantly changing)
- Blogs (new posts change the layout)
- Sites with dynamic content (news, feeds)

**Threshold settings:**
- `1-2%` - Very sensitive, good for static pages
- `5%` - Balanced, good for most sites (default)
- `10%+` - Less sensitive, for sites with some dynamic content

### Custom Check Best Practices

**Prioritize checks that:**
- Validate core functionality (checkout, forms)
- Verify critical elements (CTA buttons, sliders)
- Catch common WordPress issues (plugin conflicts)

**Example check suite for WordPress + WooCommerce:**

```json
{
  "customChecks": [
    {
      "name": "Product Slider",
      "type": "slider-working",
      "selector": ".woocommerce-product-gallery"
    },
    {
      "name": "Add to Cart Button",
      "type": "element-exists",
      "selector": ".single_add_to_cart_button"
    },
    {
      "name": "Cart Link Clickable",
      "type": "link-clickable",
      "selector": ".cart-contents"
    },
    {
      "name": "Product Image Loaded",
      "type": "image-loaded",
      "selector": ".woocommerce-product-gallery__image img"
    },
    {
      "name": "Price Display",
      "type": "text-contains",
      "selector": ".price",
      "text": "$"
    }
  ]
}
```

---

## Troubleshooting

### "Timed out after 10 seconds"

You have too many sites with Phase 2 features. Solutions:

1. **Reduce check frequency:**
   ```toml
   [functions."monitor-enhanced"]
   schedule = "*/15 * * * *"  # Every 15 minutes
   ```

2. **Disable visual checks on some sites**

3. **Split into multiple configs** by client

4. **Upgrade to Netlify Pro** for 26-second timeout

### "Chrome failed to launch"

Puppeteer/Chromium issues on Netlify. Check:

1. Dependencies are installed:
   ```bash
   npm install @sparticuz/chromium puppeteer-core
   ```

2. Using `puppeteer-core` (not `puppeteer`)

3. Function has enough memory (default is fine)

### Visual checks always showing changes

The baseline is being reset. This happens when:
- Function goes cold (storage in `/tmp` is cleared)
- Site has dynamic content (ads, rotating banners)

**Solutions:**

1. **Increase threshold:**
   ```json
   "visualCheck": {
     "threshold": 10.0
   }
   ```

2. **Wait for specific element:**
   ```json
   "visualCheck": {
     "waitForSelector": ".main-content"
   }
   ```

3. **Implement persistent storage** (ask me for help!)

### Custom checks failing unexpectedly

Verify selectors are correct:

1. Visit the website
2. Open DevTools (F12)
3. Console: `document.querySelector('.your-selector')`
4. If null, the selector is wrong

Common issues:
- Using IDs with # (`#my-form` not `my-form`)
- Class names with dots (`.slider` not `slider`)
- Case sensitivity (`#ContactForm` vs `#contactform`)

---

## Rollback

If you need to rollback to Phase 1:

```bash
cd netlify/functions
mv monitor.js monitor-enhanced-backup.js
mv monitor-basic.js monitor.js
git add -A
git commit -m "Rollback to Phase 1"
git push origin main
```

Your config will still work (Phase 2 fields are ignored).

---

## Need Help?

- 📖 [Phase 2 Documentation](PHASE2.md)
- 🐛 [Open an issue on GitHub](https://github.com/jimboobrien/website-monitor/issues)
- 💬 [Discussions](https://github.com/jimboobrien/website-monitor/discussions)

---

**Ready to upgrade? Follow the steps above and enjoy Phase 2! 🚀**

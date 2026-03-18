const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const fs = require('fs').promises;
const path = require('path');

const SNAPSHOTS_DIR = '/tmp/website-monitor/snapshots';

/**
 * Initialize snapshot storage
 */
async function initSnapshotStorage() {
  try {
    await fs.mkdir(SNAPSHOTS_DIR, { recursive: true });
  } catch (error) {
    console.error('Snapshot storage init error:', error);
  }
}

/**
 * Take a full snapshot of a website
 */
async function takeSnapshot(url, options = {}) {
  const {
    captureScreenshot = true,
    captureHTML = true,
    fullPage = true,
    width = 1280,
    height = 720,
    timeout = 30000
  } = options;

  let browser = null;
  
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setViewport({ width, height });
    
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout 
    });

    const snapshot = {
      url,
      timestamp: new Date().toISOString(),
      success: true
    };

    // Capture screenshot
    if (captureScreenshot) {
      snapshot.screenshot = await page.screenshot({
        fullPage,
        type: 'png'
      });
    }

    // Capture simplified HTML (no external assets)
    if (captureHTML) {
      const html = await page.evaluate(() => {
        // Clone the document
        const clone = document.documentElement.cloneNode(true);
        
        // Remove scripts
        clone.querySelectorAll('script').forEach(el => el.remove());
        
        // Remove external stylesheets (keep inline styles)
        clone.querySelectorAll('link[rel="stylesheet"]').forEach(el => el.remove());
        
        // Remove external images (replace with placeholder)
        clone.querySelectorAll('img').forEach(img => {
          if (img.src && (img.src.startsWith('http') || img.src.startsWith('//'))) {
            img.setAttribute('data-original-src', img.src);
            img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage%3C/text%3E%3C/svg%3E';
          }
        });
        
        // Remove iframes
        clone.querySelectorAll('iframe').forEach(el => {
          const placeholder = document.createElement('div');
          placeholder.textContent = '[iframe removed]';
          placeholder.style.cssText = 'border: 2px dashed #ccc; padding: 20px; text-align: center; color: #999;';
          el.replaceWith(placeholder);
        });
        
        return '<!DOCTYPE html>\n' + clone.outerHTML;
      });
      
      snapshot.html = html;
      snapshot.htmlSize = Buffer.byteLength(html, 'utf8');
    }

    // Capture metadata
    snapshot.metadata = await page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content || '',
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      url: window.location.href
    }));

    return snapshot;
  } catch (error) {
    console.error('Snapshot error:', error);
    return {
      url,
      timestamp: new Date().toISOString(),
      success: false,
      error: error.message
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Save a snapshot to storage
 */
async function saveSnapshot(websiteId, snapshot) {
  try {
    await initSnapshotStorage();
    
    const timestamp = new Date(snapshot.timestamp).getTime();
    const siteDir = path.join(SNAPSHOTS_DIR, websiteId);
    await fs.mkdir(siteDir, { recursive: true });
    
    // Save screenshot
    if (snapshot.screenshot) {
      const screenshotPath = path.join(siteDir, `${timestamp}.png`);
      await fs.writeFile(screenshotPath, snapshot.screenshot);
    }
    
    // Save HTML
    if (snapshot.html) {
      const htmlPath = path.join(siteDir, `${timestamp}.html`);
      await fs.writeFile(htmlPath, snapshot.html, 'utf8');
    }
    
    // Save metadata
    const metadataPath = path.join(siteDir, `${timestamp}.json`);
    await fs.writeFile(metadataPath, JSON.stringify({
      url: snapshot.url,
      timestamp: snapshot.timestamp,
      metadata: snapshot.metadata,
      htmlSize: snapshot.htmlSize,
      hasScreenshot: !!snapshot.screenshot,
      hasHTML: !!snapshot.html
    }, null, 2));
    
    return { 
      success: true, 
      path: siteDir,
      timestamp 
    };
  } catch (error) {
    console.error('Save snapshot error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * List all snapshots for a website
 */
async function listSnapshots(websiteId) {
  try {
    const siteDir = path.join(SNAPSHOTS_DIR, websiteId);
    
    try {
      await fs.access(siteDir);
    } catch {
      return { success: true, snapshots: [] };
    }
    
    const files = await fs.readdir(siteDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const snapshots = await Promise.all(
      jsonFiles.map(async (file) => {
        const filePath = path.join(siteDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(content);
        const timestamp = parseInt(file.replace('.json', ''));
        
        return {
          ...data,
          timestamp,
          date: new Date(timestamp).toISOString(),
          screenshotPath: path.join(siteDir, `${timestamp}.png`),
          htmlPath: path.join(siteDir, `${timestamp}.html`)
        };
      })
    );
    
    // Sort by timestamp (newest first)
    snapshots.sort((a, b) => b.timestamp - a.timestamp);
    
    return { 
      success: true, 
      snapshots,
      count: snapshots.length 
    };
  } catch (error) {
    console.error('List snapshots error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Get a specific snapshot
 */
async function getSnapshot(websiteId, timestamp) {
  try {
    const siteDir = path.join(SNAPSHOTS_DIR, websiteId);
    
    const metadataPath = path.join(siteDir, `${timestamp}.json`);
    const screenshotPath = path.join(siteDir, `${timestamp}.png`);
    const htmlPath = path.join(siteDir, `${timestamp}.html`);
    
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    
    let screenshot = null;
    let html = null;
    
    try {
      screenshot = await fs.readFile(screenshotPath);
    } catch {}
    
    try {
      html = await fs.readFile(htmlPath, 'utf8');
    } catch {}
    
    return {
      success: true,
      snapshot: {
        ...metadata,
        timestamp,
        screenshot,
        html
      }
    };
  } catch (error) {
    console.error('Get snapshot error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete old snapshots (keep only N most recent)
 */
async function cleanupSnapshots(websiteId, keepCount = 10) {
  try {
    const list = await listSnapshots(websiteId);
    
    if (!list.success || list.snapshots.length <= keepCount) {
      return { success: true, deleted: 0 };
    }
    
    const toDelete = list.snapshots.slice(keepCount);
    const siteDir = path.join(SNAPSHOTS_DIR, websiteId);
    
    let deleted = 0;
    for (const snapshot of toDelete) {
      try {
        await fs.unlink(path.join(siteDir, `${snapshot.timestamp}.json`));
        await fs.unlink(path.join(siteDir, `${snapshot.timestamp}.png`));
        await fs.unlink(path.join(siteDir, `${snapshot.timestamp}.html`));
        deleted++;
      } catch (err) {
        console.error(`Error deleting snapshot ${snapshot.timestamp}:`, err);
      }
    }
    
    return { 
      success: true, 
      deleted,
      kept: keepCount
    };
  } catch (error) {
    console.error('Cleanup snapshots error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

module.exports = {
  takeSnapshot,
  saveSnapshot,
  listSnapshots,
  getSnapshot,
  cleanupSnapshots
};

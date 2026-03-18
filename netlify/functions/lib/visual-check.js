const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

/**
 * Take a screenshot of a website
 */
async function takeScreenshot(url, options = {}) {
  const {
    width = 1280,
    height = 720,
    fullPage = false,
    waitForSelector = null,
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

    // Wait for specific selector if provided
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 10000 });
    }

    const screenshot = await page.screenshot({
      fullPage,
      type: 'png'
    });

    return {
      success: true,
      screenshot,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Screenshot error:', error);
    return {
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
 * Compare two screenshots and return difference percentage
 */
function compareScreenshots(baseline, current) {
  try {
    const baselineImg = PNG.sync.read(baseline);
    const currentImg = PNG.sync.read(current);

    const { width, height } = baselineImg;
    
    // Images must be same size
    if (currentImg.width !== width || currentImg.height !== height) {
      return {
        success: false,
        error: 'Image dimensions do not match'
      };
    }

    const diff = new PNG({ width, height });
    const numDiffPixels = pixelmatch(
      baselineImg.data,
      currentImg.data,
      diff.data,
      width,
      height,
      { threshold: 0.1 }
    );

    const totalPixels = width * height;
    const diffPercentage = (numDiffPixels / totalPixels) * 100;

    return {
      success: true,
      diffPixels: numDiffPixels,
      totalPixels,
      diffPercentage: diffPercentage.toFixed(2),
      diffImage: PNG.sync.write(diff)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check if a website has visual changes
 */
async function visualCheck(url, baseline, options = {}) {
  const { threshold = 5.0 } = options; // 5% difference threshold

  const screenshot = await takeScreenshot(url, options);
  
  if (!screenshot.success) {
    return {
      success: false,
      error: screenshot.error
    };
  }

  // If no baseline, this IS the baseline
  if (!baseline) {
    return {
      success: true,
      isBaseline: true,
      screenshot: screenshot.screenshot,
      message: 'Baseline screenshot created'
    };
  }

  // Compare with baseline
  const comparison = compareScreenshots(baseline, screenshot.screenshot);
  
  if (!comparison.success) {
    return {
      success: false,
      error: comparison.error
    };
  }

  const hasChanged = parseFloat(comparison.diffPercentage) > threshold;

  return {
    success: true,
    hasChanged,
    diffPercentage: comparison.diffPercentage,
    diffPixels: comparison.diffPixels,
    threshold,
    screenshot: screenshot.screenshot,
    diffImage: comparison.diffImage
  };
}

module.exports = {
  takeScreenshot,
  compareScreenshots,
  visualCheck
};

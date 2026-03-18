const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

/**
 * Run custom checks on a website using Puppeteer
 */
async function runCustomChecks(url, checks = []) {
  if (!checks || checks.length === 0) {
    return { success: true, results: [] };
  }

  let browser = null;
  
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    const results = [];

    for (const check of checks) {
      const result = await executeCheck(page, check);
      results.push({
        ...result,
        checkName: check.name,
        checkType: check.type
      });
    }

    return {
      success: true,
      results
    };
  } catch (error) {
    console.error('Custom checks error:', error);
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
 * Execute a single check based on its type
 */
async function executeCheck(page, check) {
  try {
    switch (check.type) {
      case 'element-exists':
        return await checkElementExists(page, check);
      
      case 'text-contains':
        return await checkTextContains(page, check);
      
      case 'slider-working':
        return await checkSlider(page, check);
      
      case 'form-submits':
        return await checkForm(page, check);
      
      case 'link-clickable':
        return await checkLink(page, check);
      
      case 'image-loaded':
        return await checkImageLoaded(page, check);
      
      case 'custom-script':
        return await checkCustomScript(page, check);
      
      default:
        return {
          passed: false,
          error: `Unknown check type: ${check.type}`
        };
    }
  } catch (error) {
    return {
      passed: false,
      error: error.message
    };
  }
}

/**
 * Check if an element exists
 */
async function checkElementExists(page, check) {
  const { selector } = check;
  
  try {
    await page.waitForSelector(selector, { timeout: 5000 });
    return {
      passed: true,
      message: `Element found: ${selector}`
    };
  } catch (error) {
    return {
      passed: false,
      message: `Element not found: ${selector}`
    };
  }
}

/**
 * Check if text contains specific content
 */
async function checkTextContains(page, check) {
  const { selector, text } = check;
  
  try {
    const element = await page.waitForSelector(selector, { timeout: 5000 });
    const content = await element.evaluate(el => el.textContent);
    
    const contains = content.includes(text);
    
    return {
      passed: contains,
      message: contains 
        ? `Text found: "${text}"` 
        : `Text not found: "${text}" (found: "${content}")`
    };
  } catch (error) {
    return {
      passed: false,
      message: `Error checking text: ${error.message}`
    };
  }
}

/**
 * Check if a slider is working
 */
async function checkSlider(page, check) {
  const { selector, slideCount } = check;
  
  try {
    await page.waitForSelector(selector, { timeout: 5000 });
    
    // Check if slider exists and has slides
    const slideInfo = await page.evaluate((sel) => {
      const slider = document.querySelector(sel);
      if (!slider) return { exists: false };
      
      // Common slider selectors
      const slides = slider.querySelectorAll('.slide, .slider-item, .carousel-item, [class*="slide"]');
      
      return {
        exists: true,
        slideCount: slides.length,
        isVisible: slider.offsetParent !== null
      };
    }, selector);
    
    if (!slideInfo.exists) {
      return {
        passed: false,
        message: 'Slider element not found'
      };
    }
    
    if (!slideInfo.isVisible) {
      return {
        passed: false,
        message: 'Slider exists but is not visible'
      };
    }
    
    if (slideCount && slideInfo.slideCount < slideCount) {
      return {
        passed: false,
        message: `Expected ${slideCount} slides, found ${slideInfo.slideCount}`
      };
    }
    
    return {
      passed: true,
      message: `Slider working with ${slideInfo.slideCount} slides`
    };
  } catch (error) {
    return {
      passed: false,
      message: `Slider check failed: ${error.message}`
    };
  }
}

/**
 * Check if a form can be submitted
 */
async function checkForm(page, check) {
  const { selector } = check;
  
  try {
    const form = await page.waitForSelector(selector, { timeout: 5000 });
    
    const formInfo = await form.evaluate(f => ({
      exists: true,
      action: f.action,
      method: f.method,
      hasSubmit: !!f.querySelector('button[type="submit"], input[type="submit"]')
    }));
    
    return {
      passed: formInfo.hasSubmit,
      message: formInfo.hasSubmit 
        ? `Form found with submit button (${formInfo.method} to ${formInfo.action})` 
        : 'Form found but no submit button'
    };
  } catch (error) {
    return {
      passed: false,
      message: `Form check failed: ${error.message}`
    };
  }
}

/**
 * Check if a link is clickable
 */
async function checkLink(page, check) {
  const { selector } = check;
  
  try {
    const link = await page.waitForSelector(selector, { timeout: 5000 });
    
    const isClickable = await link.evaluate(l => {
      const style = window.getComputedStyle(l);
      return style.pointerEvents !== 'none' && 
             style.display !== 'none' && 
             style.visibility !== 'hidden';
    });
    
    return {
      passed: isClickable,
      message: isClickable ? 'Link is clickable' : 'Link exists but is not clickable'
    };
  } catch (error) {
    return {
      passed: false,
      message: `Link check failed: ${error.message}`
    };
  }
}

/**
 * Check if an image is loaded
 */
async function checkImageLoaded(page, check) {
  const { selector } = check;
  
  try {
    const image = await page.waitForSelector(selector, { timeout: 5000 });
    
    const imageInfo = await image.evaluate(img => ({
      complete: img.complete,
      naturalHeight: img.naturalHeight,
      naturalWidth: img.naturalWidth,
      src: img.src
    }));
    
    const isLoaded = imageInfo.complete && imageInfo.naturalHeight > 0;
    
    return {
      passed: isLoaded,
      message: isLoaded 
        ? `Image loaded (${imageInfo.naturalWidth}x${imageInfo.naturalHeight})` 
        : 'Image not loaded or broken'
    };
  } catch (error) {
    return {
      passed: false,
      message: `Image check failed: ${error.message}`
    };
  }
}

/**
 * Run custom JavaScript on the page
 */
async function checkCustomScript(page, check) {
  const { script } = check;
  
  try {
    const result = await page.evaluate(script);
    
    return {
      passed: !!result,
      message: result ? 'Custom script passed' : 'Custom script failed',
      result
    };
  } catch (error) {
    return {
      passed: false,
      message: `Custom script error: ${error.message}`
    };
  }
}

module.exports = {
  runCustomChecks
};

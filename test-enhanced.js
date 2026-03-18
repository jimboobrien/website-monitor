/**
 * Local testing script for Phase 2 enhanced monitor
 * Run with: node test-enhanced.js
 * Make sure to create a .env file with your credentials first
 */

require('dotenv').config();
const { handler } = require('./netlify/functions/monitor-enhanced');

async function test() {
  console.log('🧪 Testing ENHANCED monitoring function (Phase 2)...\n');
  console.log('⚠️  This will take longer than basic monitoring (launching Chrome)...\n');
  
  const startTime = Date.now();
  
  const result = await handler({}, {});
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log(`\n⏱️  Completed in ${duration} seconds\n`);
  console.log('📊 Result:');
  
  const response = JSON.parse(result.body);
  
  // Pretty print with highlights
  console.log('\n=== STATS ===');
  console.log(`Total checked: ${response.stats.totalChecked}`);
  console.log(`Sites up: ${response.stats.sitesUp}`);
  console.log(`Sites down: ${response.stats.sitesDown}`);
  console.log(`Visual changes: ${response.stats.visualChanges}`);
  console.log(`Custom checks failed: ${response.stats.customChecksFailed}`);
  
  if (response.results && response.results.length > 0) {
    console.log('\n=== DETAILED RESULTS ===');
    response.results.forEach(site => {
      console.log(`\n${site.name} (${site.url})`);
      console.log(`  Status: ${site.isUp ? '✅ UP' : '❌ DOWN'} (${site.responseTime}ms)`);
      
      if (site.enhanced?.visual) {
        const v = site.enhanced.visual;
        if (v.isBaseline) {
          console.log(`  Visual: 📸 Baseline created`);
        } else if (v.hasChanged) {
          console.log(`  Visual: 🎨 CHANGED (${v.diffPercentage}% difference)`);
        } else {
          console.log(`  Visual: ✅ No changes (${v.diffPercentage}% difference)`);
        }
      }
      
      if (site.enhanced?.custom?.results) {
        console.log(`  Custom checks:`);
        site.enhanced.custom.results.forEach(check => {
          const icon = check.passed ? '✅' : '❌';
          console.log(`    ${icon} ${check.checkName}: ${check.message}`);
        });
      }
    });
  }
  
  if (response.alertSent) {
    console.log('\n=== ALERT ===');
    if (response.alertSent.sent) {
      console.log(`📧 Email sent for ${response.alertSent.issues} issue(s)`);
    } else {
      console.log(`❌ Email failed: ${response.alertSent.error}`);
    }
  } else {
    console.log('\n✅ No issues detected - no alert sent');
  }
  
  console.log('\n=== FULL JSON ===');
  console.log(JSON.stringify(response, null, 2));
}

test().catch(console.error);

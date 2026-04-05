/**
 * Validate Build - Check all functions can load
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating build...\n');

const functionsDir = path.join(__dirname, 'netlify/functions');
const functions = fs.readdirSync(functionsDir).filter(f => f.endsWith('.js'));

let errors = 0;
let warnings = 0;

console.log('📦 Checking Netlify Functions:\n');

functions.forEach(funcFile => {
  const funcPath = path.join(functionsDir, funcFile);
  process.stdout.write(`   ${funcFile.padEnd(30)} `);
  
  try {
    // Try to require the function
    delete require.cache[require.resolve(funcPath)];
    const func = require(funcPath);
    
    // Check if it has a handler
    if (func.handler && typeof func.handler === 'function') {
      console.log('✅ OK');
    } else {
      console.log('⚠️  No handler export');
      warnings++;
    }
  } catch (error) {
    console.log(`❌ ERROR`);
    console.log(`      ${error.message}`);
    errors++;
  }
});

console.log('\n📊 Validation Summary:\n');
console.log(`   Functions checked: ${functions.length}`);
console.log(`   Errors: ${errors}`);
console.log(`   Warnings: ${warnings}`);

if (errors > 0) {
  console.log('\n❌ Build validation failed - fix errors above');
  process.exit(1);
} else if (warnings > 0) {
  console.log('\n⚠️  Build validation passed with warnings');
  process.exit(0);
} else {
  console.log('\n✅ Build validation passed!');
  process.exit(0);
}

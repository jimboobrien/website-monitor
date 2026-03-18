/**
 * Local testing script - run with: node test-local.js
 * Make sure to create a .env file with your credentials first
 */

require('dotenv').config();
const { handler } = require('./netlify/functions/monitor');

async function test() {
  console.log('🧪 Testing monitoring function locally...\n');
  
  const result = await handler({}, {});
  
  console.log('\n📊 Result:');
  console.log(JSON.parse(result.body));
}

test().catch(console.error);

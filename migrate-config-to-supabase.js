/**
 * Migrate Config to Supabase
 * Reads config.json and creates database records
 * 
 * Usage: node migrate-config-to-supabase.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function loadConfig() {
  try {
    const configPath = path.join(__dirname, 'config.json');
    const configData = await fs.readFile(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('❌ Error loading config.json:', error.message);
    console.error('Make sure config.json exists in the project root');
    process.exit(1);
  }
}

async function migrateClients(clients) {
  if (!clients || clients.length === 0) {
    console.log('   No clients to migrate');
    return;
  }
  
  console.log(`\n📋 Migrating ${clients.length} clients...`);
  
  for (const client of clients) {
    try {
      const { data, error } = await supabase
        .from('clients')
        .upsert([{
          id: client.id,
          name: client.name,
          email: client.email || null,
          notes: client.notes || null
        }], {
          onConflict: 'id'
        })
        .select()
        .single();
      
      if (error) throw error;
      console.log(`   ✅ ${client.name} (${client.id})`);
    } catch (error) {
      console.error(`   ❌ Failed to migrate client ${client.id}:`, error.message);
    }
  }
}

async function migrateWebsites(websites) {
  if (!websites || websites.length === 0) {
    console.log('   No websites to migrate');
    return;
  }
  
  console.log(`\n🌐 Migrating ${websites.length} websites...`);
  
  for (const website of websites) {
    try {
      // Generate ID if not present
      const id = website.id || website.url.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      
      const { data, error } = await supabase
        .from('websites')
        .upsert([{
          id,
          name: website.name,
          url: website.url,
          client_id: website.clientId || null,
          check_interval: website.interval || 5,
          visual_check_enabled: website.visualCheck?.enabled || false,
          snapshot_enabled: website.snapshot?.enabled || false,
          custom_checks: website.customChecks || [],
          enabled: website.enabled !== false // default to true
        }], {
          onConflict: 'id'
        })
        .select()
        .single();
      
      if (error) throw error;
      console.log(`   ✅ ${website.name} (${id})`);
    } catch (error) {
      console.error(`   ❌ Failed to migrate website ${website.name}:`, error.message);
    }
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');
  
  try {
    // Check clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name');
    
    if (clientsError) throw clientsError;
    console.log(`   ✅ ${clients?.length || 0} clients in database`);
    
    // Check websites
    const { data: websites, error: websitesError } = await supabase
      .from('websites')
      .select('id, name, url');
    
    if (websitesError) throw websitesError;
    console.log(`   ✅ ${websites?.length || 0} websites in database`);
    
    if (websites && websites.length > 0) {
      console.log('\n📊 Websites in database:');
      websites.forEach(w => {
        console.log(`   - ${w.name} (${w.id})`);
        console.log(`     URL: ${w.url}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('   ❌ Verification failed:', error.message);
    return false;
  }
}

async function migrate() {
  console.log('🚀 Starting config migration to Supabase...\n');
  
  // Load config
  const config = await loadConfig();
  console.log('✅ Loaded config.json');
  console.log(`   - ${config.clients?.length || 0} clients`);
  console.log(`   - ${config.websites?.length || 0} websites`);
  
  // Migrate clients first (foreign key dependency)
  await migrateClients(config.clients);
  
  // Migrate websites
  await migrateWebsites(config.websites);
  
  // Verify
  const success = await verifyMigration();
  
  if (success) {
    console.log('\n✨ Migration complete!');
    console.log('\nNext steps:');
    console.log('1. Check Supabase Table Editor to verify data');
    console.log('2. Update Netlify environment variables');
    console.log('3. Deploy to Netlify');
    console.log('4. Test dashboard at: https://your-site.netlify.app/dashboard/');
  } else {
    console.log('\n⚠️  Migration completed with errors. Check output above.');
  }
}

// Run migration
migrate().catch(error => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});

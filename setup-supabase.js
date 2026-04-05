/**
 * Supabase Database Setup Script
 * Run this once to create all required tables, indexes, and storage buckets
 * 
 * Usage: node setup-supabase.js
 */

require('dotenv').config({ path: require('path').join(__dirname, './.env') });
var process = require('process');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// SQL schema for all tables
const schema = `
-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS alert_history CASCADE;
DROP TABLE IF EXISTS visual_baselines CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS monitor_checks CASCADE;
DROP TABLE IF EXISTS websites CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

-- Client/customer information
CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monitor configuration (replaces config.json)
CREATE TABLE websites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  check_interval INTEGER DEFAULT 5,
  visual_check_enabled BOOLEAN DEFAULT false,
  snapshot_enabled BOOLEAN DEFAULT false,
  custom_checks JSONB DEFAULT '[]'::jsonb,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time-series check results
CREATE TABLE monitor_checks (
  id BIGSERIAL PRIMARY KEY,
  website_id TEXT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('up', 'down', 'unknown')),
  response_time INTEGER,
  status_code INTEGER,
  error_message TEXT,
  issues JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Aggregated downtime events
CREATE TABLE incidents (
  id BIGSERIAL PRIMARY KEY,
  website_id TEXT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  incident_type TEXT NOT NULL,
  severity TEXT,
  message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Visual baseline metadata
CREATE TABLE visual_baselines (
  website_id TEXT PRIMARY KEY REFERENCES websites(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email/notification history
CREATE TABLE alert_history (
  id BIGSERIAL PRIMARY KEY,
  website_id TEXT REFERENCES websites(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  alert_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  success BOOLEAN NOT NULL,
  error_message TEXT
);

-- Create indexes for performance
CREATE INDEX idx_checks_website_timestamp ON monitor_checks(website_id, timestamp DESC);
CREATE INDEX idx_checks_status ON monitor_checks(status);
CREATE INDEX idx_checks_timestamp ON monitor_checks(timestamp DESC);
CREATE INDEX idx_incidents_website_started ON incidents(website_id, started_at DESC);
CREATE INDEX idx_incidents_resolved ON incidents(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_alerts_website_sent ON alert_history(website_id, sent_at DESC);

-- Add comments for documentation
COMMENT ON TABLE clients IS 'Customer/client information for organizing monitors';
COMMENT ON TABLE websites IS 'Website monitor configuration and settings';
COMMENT ON TABLE monitor_checks IS 'Time-series data of all monitoring checks';
COMMENT ON TABLE incidents IS 'Aggregated downtime/incident events';
COMMENT ON TABLE visual_baselines IS 'Visual comparison baseline screenshot metadata';
COMMENT ON TABLE alert_history IS 'History of sent email/notification alerts';
`;

async function setupDatabase() {
  console.log('🚀 Starting Supabase database setup...\n');
  
  try {
    // Execute schema - Supabase doesn't support direct SQL execution via API
    // We need to show the SQL for manual execution
    console.log('⚠️  Cannot execute SQL directly via API.');
    console.log('📋 Please run the following SQL in Supabase SQL Editor:\n');
    console.log('------- SQL SCHEMA START -------');
    console.log(schema);
    console.log('------- SQL SCHEMA END -------\n');
    console.log('Steps:');
    console.log(`1. Go to: ${supabaseUrl.replace('//', '//')}/project/_/sql/new`);
    console.log('2. Paste the SQL above');
    console.log('3. Click "Run"');
    console.log('4. Run this script again to verify\n');
    
    // Test database connectivity
    console.log('🔍 Testing database connection...');
    const { data: clientsTest, error: testError } = await supabase
      .from('clients')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Database connection test failed:', testError.message);
      console.log('\nPlease create tables manually using the SQL above.');
      return;
    }
    
    console.log('✅ Database connection successful\n');
    
    // Check for storage buckets
    console.log('📦 Setting up storage buckets...');
    const { data: buckets } = await supabase.storage.listBuckets();
    
    const requiredBuckets = ['screenshots', 'baselines'];
    for (const bucketName of requiredBuckets) {
      const exists = buckets?.find(b => b.name === bucketName);
      
      if (!exists) {
        console.log(`   Creating bucket: ${bucketName}`);
        const { error: bucketError } = await supabase.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 5242880 // 5MB
        });
        
        if (bucketError) {
          console.error(`   ❌ Failed to create ${bucketName}:`, bucketError.message);
        } else {
          console.log(`   ✅ Created ${bucketName}`);
        }
      } else {
        console.log(`   ✅ ${bucketName} already exists`);
      }
    }
    
    console.log('\n✨ Supabase setup complete!\n');
    console.log('Next steps:');
    console.log('1. Migrate existing data (if any) from /tmp storage');
    console.log('2. Update config.json to add website IDs');
    console.log('3. Test monitoring functions');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run setup
setupDatabase();

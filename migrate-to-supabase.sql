-- ============================================
-- Migrate config.json to Supabase Tables
-- Run this in Supabase SQL Editor
-- ============================================

-- Insert Clients
-- Uses ON CONFLICT to safely update if already exists
INSERT INTO clients (id, name, email, notes)
VALUES
  ('vqdev', 'VQDEV', NULL, NULL),
  ('chris-hixson', 'Chris Hixson', NULL, NULL),
  ('cadence', 'Cadence', NULL, NULL),
  ('ops-pals-place', 'Ops Pals Place', NULL, NULL),
  ('uptown-life-group', 'Uptown Life Group', NULL, NULL)
ON CONFLICT (id) 
DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  notes = EXCLUDED.notes;

-- Insert Websites
-- Generates IDs from URLs and uses ON CONFLICT for safety
INSERT INTO websites (id, name, url, client_id, check_interval, visual_check_enabled, snapshot_enabled, custom_checks, enabled)
VALUES
  -- VQDEV websites
  ('https-avenafamilyphotos-com', 'Avena Family Photos', 'https://avenafamilyphotos.com', 'vqdev', 5, false, false, '[]'::jsonb, true),
  ('https-meowweretalkin-com', 'Meow Were Talkin', 'https://meowweretalkin.com', 'vqdev', 5, false, false, '[]'::jsonb, true),
  ('https-pegasustheme-com', 'Pegasus Theme', 'https://pegasustheme.com', 'vqdev', 5, false, false, '[]'::jsonb, true),
  ('https-vqdevhtml-com', 'VQDEV HTML', 'https://vqdevhtml.com', 'vqdev', 5, false, false, '[]'::jsonb, true),
  ('https-visionquestdev-com', 'Vision Quest Dev', 'https://visionquestdev.com', 'vqdev', 5, false, false, '[]'::jsonb, true),
  ('https-visionquestdevelopment-com', 'Vision Quest Development', 'https://visionquestdevelopment.com', 'vqdev', 5, false, false, '[]'::jsonb, true),
  
  -- Chris Hixson websites
  ('https-chrishixson-com', 'Chris Hixson', 'https://chrishixson.com', 'chris-hixson', 5, false, false, '[]'::jsonb, true),
  ('https-qbiqsystem-com', 'QBIQ System', 'https://qbiqsystem.com', 'chris-hixson', 5, false, false, '[]'::jsonb, true),
  ('https-qbiqcamp-com', 'QBIQ Camp', 'https://qbiqcamp.com', 'chris-hixson', 5, false, false, '[]'::jsonb, true),
  ('https-theshootout-camp', 'The Shootout Camp', 'https://theshootout.camp', 'chris-hixson', 5, false, false, '[]'::jsonb, true),
  ('https-theexperience-camp', 'The Experience Camp', 'https://theexperience.camp', 'chris-hixson', 5, false, false, '[]'::jsonb, true),
  
  -- Cadence websites
  ('https-cadence-group-com', 'Cadence Group', 'https://cadence-group.com', 'cadence', 5, false, false, '[]'::jsonb, true),
  ('https-dev-cadence-group-com', 'Cadence Group Dev', 'https://dev.cadence-group.com', 'cadence', 5, false, false, '[]'::jsonb, true),
  
  -- Ops Pals Place websites
  ('https-ourpalsplace-org', 'Our Pals Place', 'https://ourpalsplace.org', 'ops-pals-place', 5, false, false, '[]'::jsonb, true),
  ('https-opp-ourpalsplace-org', 'OPP Subdomain', 'https://opp.ourpalsplace.org', 'ops-pals-place', 5, false, false, '[]'::jsonb, true),
  ('https-dbt-ourpalsplace-org', 'DBT Our Pals Place', 'https://dbt.ourpalsplace.org', 'ops-pals-place', 5, false, false, '[]'::jsonb, true),
  
  -- No client assigned
  ('https-vineandvisionconsulting-com', 'Vine and Vision Consulting', 'https://vineandvisionconsulting.com', NULL, 5, false, false, '[]'::jsonb, true),
  ('https-sagescnc-com', 'Sages CNC', 'https://sagescnc.com', NULL, 5, false, false, '[]'::jsonb, true),
  
  -- Uptown Life Group websites
  ('https-uptownlifegroup-com', 'Uptown Life Group', 'https://uptownlifegroup.com', 'uptown-life-group', 5, false, false, '[]'::jsonb, true),
  ('http-events-uptownlifegroup-com', 'Uptown Life Group Events', 'http://events.uptownlifegroup.com', 'uptown-life-group', 5, false, false, '[]'::jsonb, true),
  ('https-theloft-com', 'The Loft', 'https://theloft.com', 'uptown-life-group', 5, false, false, '[]'::jsonb, true),
  ('https-mabellas-com', 'Mabellas', 'https://mabellas.com', 'uptown-life-group', 5, false, false, '[]'::jsonb, true),
  ('https-saltcellar-com', 'Salt Cellar', 'https://saltcellar.com', 'uptown-life-group', 5, false, false, '[]'::jsonb, true),
  ('https-themixmarket-com', 'The Mix Market', 'https://themixmarket.com', 'uptown-life-group', 5, false, false, '[]'::jsonb, true),
  ('http-tommygs-com', 'Tommy G''s', 'http://tommygs.com', 'uptown-life-group', 5, false, false, '[]'::jsonb, true)
ON CONFLICT (id) 
DO UPDATE SET
  name = EXCLUDED.name,
  url = EXCLUDED.url,
  client_id = EXCLUDED.client_id,
  check_interval = EXCLUDED.check_interval,
  visual_check_enabled = EXCLUDED.visual_check_enabled,
  snapshot_enabled = EXCLUDED.snapshot_enabled,
  custom_checks = EXCLUDED.custom_checks,
  enabled = EXCLUDED.enabled;

-- Verify migration
SELECT 'Clients migrated:' as status, COUNT(*) as count FROM clients;
SELECT 'Websites migrated:' as status, COUNT(*) as count FROM websites;

-- Show migrated data
SELECT * FROM clients ORDER BY name;
SELECT id, name, url, client_id FROM websites ORDER BY client_id, name;

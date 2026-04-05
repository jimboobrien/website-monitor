-- Add environment column to monitor_checks and incidents
ALTER TABLE monitor_checks ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'production';
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'production';

-- Index for fast filtering/deletion by environment
CREATE INDEX IF NOT EXISTS idx_checks_environment ON monitor_checks(environment);
CREATE INDEX IF NOT EXISTS idx_incidents_environment ON incidents(environment);

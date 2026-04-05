-- Add color column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6B7280';

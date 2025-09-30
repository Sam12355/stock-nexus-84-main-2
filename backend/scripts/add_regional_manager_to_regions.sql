-- Add regional_manager_id column to regions table
ALTER TABLE regions ADD COLUMN regional_manager_id UUID REFERENCES users(id) ON DELETE SET NULL;

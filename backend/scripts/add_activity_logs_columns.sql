-- Add missing columns to activity_logs table
-- This migration adds branch_id, entity_type, and entity_id columns

-- Add branch_id column
ALTER TABLE activity_logs 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- Add entity_type column
ALTER TABLE activity_logs 
ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50);

-- Add entity_id column
ALTER TABLE activity_logs 
ADD COLUMN IF NOT EXISTS entity_id UUID;

-- Add index for branch_id
CREATE INDEX IF NOT EXISTS idx_activity_logs_branch_id ON activity_logs(branch_id);

-- Add index for entity_type
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs(entity_type);

-- Add index for entity_id
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_id ON activity_logs(entity_id);






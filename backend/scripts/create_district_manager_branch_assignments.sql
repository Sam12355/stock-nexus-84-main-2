-- Create district_manager_branch_assignments table
-- This table stores which branches a district manager can access/manage

CREATE TABLE IF NOT EXISTS district_manager_branch_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district_manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Who assigned this (usually regional manager)
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(district_manager_id, branch_id) -- Prevent duplicate assignments
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dm_branch_assignments_dm_id ON district_manager_branch_assignments(district_manager_id);
CREATE INDEX IF NOT EXISTS idx_dm_branch_assignments_branch_id ON district_manager_branch_assignments(branch_id);
CREATE INDEX IF NOT EXISTS idx_dm_branch_assignments_assigned_by ON district_manager_branch_assignments(assigned_by);

-- Add comment
COMMENT ON TABLE district_manager_branch_assignments IS 'Stores which branches each district manager can access/manage';






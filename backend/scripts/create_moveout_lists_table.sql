-- Create moveout_lists table
CREATE TABLE IF NOT EXISTS moveout_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL DEFAULT 'Moveout List',
    description TEXT,
    items JSONB NOT NULL, -- Store the items array as JSON
    generated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_moveout_lists_generated_by ON moveout_lists(generated_by);
CREATE INDEX IF NOT EXISTS idx_moveout_lists_branch_id ON moveout_lists(branch_id);
CREATE INDEX IF NOT EXISTS idx_moveout_lists_status ON moveout_lists(status);
CREATE INDEX IF NOT EXISTS idx_moveout_lists_created_at ON moveout_lists(created_at);

-- Add comments
COMMENT ON TABLE moveout_lists IS 'Stores generated moveout lists with their items and metadata';
COMMENT ON COLUMN moveout_lists.items IS 'JSON array of items with their details (itemId, itemName, currentQuantity, requestingQuantity)';
COMMENT ON COLUMN moveout_lists.status IS 'Status of the moveout list: active, completed, or cancelled';





-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_type VARCHAR(50) DEFAULT 'general',
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_branch_id ON calendar_events(branch_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);

-- Add some sample events
INSERT INTO calendar_events (title, description, event_date, event_type, branch_id, created_by) VALUES
('Monthly Team Meeting', 'Monthly team review and planning meeting', '2025-02-01', 'meeting', (SELECT id FROM branches LIMIT 1), (SELECT id FROM users WHERE role = 'regional_manager' LIMIT 1)),
('Stock Audit', 'Quarterly stock audit and inventory check', '2025-02-04', 'audit', (SELECT id FROM branches LIMIT 1), (SELECT id FROM users WHERE role = 'regional_manager' LIMIT 1)),
('Regional Manager Conference', 'Annual regional managers conference', '2025-02-06', 'conference', (SELECT id FROM branches LIMIT 1), (SELECT id FROM users WHERE role = 'regional_manager' LIMIT 1)),
('Branch Opening Ceremony', 'Grand opening of new branch location', '2025-02-09', 'ceremony', (SELECT id FROM branches LIMIT 1), (SELECT id FROM users WHERE role = 'regional_manager' LIMIT 1)),
('Training Workshop', 'Staff training workshop on new procedures', '2025-02-13', 'training', (SELECT id FROM branches LIMIT 1), (SELECT id FROM users WHERE role = 'regional_manager' LIMIT 1));

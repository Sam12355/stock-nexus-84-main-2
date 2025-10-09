-- Add missing columns to fix schema issues
-- This script adds all the columns that the application expects but are missing from the basic schema

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS stock_alert_frequency VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS stock_alert_schedule_day INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stock_alert_schedule_date INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stock_alert_schedule_time TIME;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stock_alert_frequencies JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_schedule_time TIME;
ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_schedule_day INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_schedule_time TIME;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_schedule_date INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_schedule_time TIME;
ALTER TABLE users ADD COLUMN IF NOT EXISTS event_reminder_frequencies JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS event_daily_schedule_time TIME;
ALTER TABLE users ADD COLUMN IF NOT EXISTS event_weekly_schedule_day INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS event_weekly_schedule_time TIME;
ALTER TABLE users ADD COLUMN IF NOT EXISTS event_monthly_schedule_date INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS event_monthly_schedule_time TIME;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{}'::jsonb;

-- Add missing columns to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS low_level INTEGER DEFAULT 5;
ALTER TABLE items ADD COLUMN IF NOT EXISTS critical_level INTEGER DEFAULT 2;

-- Add missing columns to stock table
ALTER TABLE stock ADD COLUMN IF NOT EXISTS low_stock_alert_sent BOOLEAN DEFAULT false;
ALTER TABLE stock ADD COLUMN IF NOT EXISTS critical_stock_alert_sent BOOLEAN DEFAULT false;

-- Create calendar_events table if it doesn't exist
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

-- Create indexes for calendar_events
CREATE INDEX IF NOT EXISTS idx_calendar_events_branch_id ON calendar_events(branch_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);

-- Create scheduled_notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    frequency VARCHAR(20),
    is_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for scheduled_notifications
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_user_id ON scheduled_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled_time ON scheduled_notifications(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_is_sent ON scheduled_notifications(is_sent);

-- Create stock_receipts table if it doesn't exist
CREATE TABLE IF NOT EXISTS stock_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    supplier_name VARCHAR(200),
    total_amount DECIMAL(10,2),
    receipt_date DATE NOT NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    receipt_file_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for stock_receipts
CREATE INDEX IF NOT EXISTS idx_stock_receipts_branch_id ON stock_receipts(branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_receipts_receipt_date ON stock_receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_stock_receipts_created_by ON stock_receipts(created_by);

-- Create branch_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS branch_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(user_id, branch_id)
);

-- Create indexes for branch_assignments
CREATE INDEX IF NOT EXISTS idx_branch_assignments_user_id ON branch_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_branch_assignments_branch_id ON branch_assignments(branch_id);

-- Add constraints for new columns
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS check_stock_alert_frequency 
    CHECK (stock_alert_frequency IS NULL OR stock_alert_frequency IN ('immediate', 'daily', 'weekly', 'monthly'));

ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS check_weekly_schedule_day 
    CHECK (weekly_schedule_day IS NULL OR (weekly_schedule_day >= 0 AND weekly_schedule_day <= 6));

ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS check_monthly_schedule_date 
    CHECK (monthly_schedule_date IS NULL OR (monthly_schedule_date >= 1 AND monthly_schedule_date <= 31));

ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS check_event_weekly_schedule_day 
    CHECK (event_weekly_schedule_day IS NULL OR (event_weekly_schedule_day >= 0 AND event_weekly_schedule_day <= 6));

ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS check_event_monthly_schedule_date 
    CHECK (event_monthly_schedule_date IS NULL OR (event_monthly_schedule_date >= 1 AND event_monthly_schedule_date <= 31));

-- Update triggers for new tables
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scheduled_notifications_updated_at BEFORE UPDATE ON scheduled_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_receipts_updated_at BEFORE UPDATE ON stock_receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

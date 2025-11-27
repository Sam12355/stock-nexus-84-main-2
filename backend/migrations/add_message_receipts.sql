-- Add delivered_at and read_at columns for message delivery and read receipts
-- Keep is_read column for backward compatibility

-- Check if delivered_at column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'delivered_at'
    ) THEN
        ALTER TABLE messages ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN messages.delivered_at IS 'Timestamp when message was delivered to recipient (recipient was online)';
        RAISE NOTICE 'Added delivered_at column to messages table';
    ELSE
        RAISE NOTICE 'delivered_at column already exists';
    END IF;
END $$;

-- Check if read_at column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'read_at'
    ) THEN
        ALTER TABLE messages ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN messages.read_at IS 'Timestamp when message was read by recipient';
        RAISE NOTICE 'Added read_at column to messages table';
        
        -- Migrate existing is_read boolean data
        UPDATE messages SET read_at = created_at WHERE is_read = true;
        RAISE NOTICE 'Migrated existing read status to read_at timestamps';
    ELSE
        RAISE NOTICE 'read_at column already exists';
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_delivered_at ON messages(delivered_at);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages(read_at);

-- Log completion
DO $$ 
BEGIN
    RAISE NOTICE '✅ Message receipts migration completed successfully';
END $$;

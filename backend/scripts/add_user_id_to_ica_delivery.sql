-- Add user_id column to ica_delivery table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ica_delivery' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE ica_delivery ADD COLUMN user_id INTEGER;
    END IF;
END $$;

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_ica_delivery_user_id ON ica_delivery(user_id);

-- Add has_completed_selection field to users table
ALTER TABLE users ADD COLUMN has_completed_selection BOOLEAN DEFAULT FALSE;

-- Update existing users to have completed selection if they have branch_context
UPDATE users SET has_completed_selection = TRUE WHERE branch_context IS NOT NULL;

const { query } = require('../config/database');

async function addSelectionCompletionField() {
  try {
    console.log('Adding has_completed_selection field to users table...');
    
    // Add the column
    await query('ALTER TABLE users ADD COLUMN has_completed_selection BOOLEAN DEFAULT FALSE');
    console.log('✅ Added has_completed_selection column');
    
    // Update existing users who have branch_context
    await query('UPDATE users SET has_completed_selection = TRUE WHERE branch_context IS NOT NULL');
    console.log('✅ Updated existing users with branch_context');
    
    console.log('✅ Migration completed successfully');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ Column already exists, skipping...');
    } else {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }
}

// Run the migration
addSelectionCompletionField()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

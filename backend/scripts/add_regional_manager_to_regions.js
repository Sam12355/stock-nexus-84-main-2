const { query } = require('../config/database');

async function addRegionalManagerToRegions() {
  try {
    console.log('Adding regional_manager_id column to regions table...');
    
    // Add the column
    await query('ALTER TABLE regions ADD COLUMN regional_manager_id UUID REFERENCES users(id) ON DELETE SET NULL');
    console.log('✅ Added regional_manager_id column to regions table');
    
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
addRegionalManagerToRegions()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

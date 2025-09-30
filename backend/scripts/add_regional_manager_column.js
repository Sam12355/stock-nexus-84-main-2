const { query } = require('../config/database');

async function addRegionalManagerColumn() {
  try {
    console.log('Adding regional_manager_id column to regions table...');
    
    // Check if column already exists
    const checkResult = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'regions' AND column_name = 'regional_manager_id'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Column regional_manager_id already exists');
      return;
    }
    
    // Add the column
    await query(`
      ALTER TABLE regions 
      ADD COLUMN regional_manager_id UUID REFERENCES users(id) ON DELETE SET NULL
    `);
    console.log('✅ Added regional_manager_id column to regions table');
    
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
addRegionalManagerColumn()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

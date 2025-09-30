const { query } = require('../config/database');

async function migrateRegionDistrict() {
  try {
    console.log('🔄 Adding region_id and district_id columns to users table...');
    
    // Add region_id and district_id columns to users table
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES districts(id) ON DELETE SET NULL
    `);
    
    console.log('✅ Added region_id and district_id columns');
    
    // Create indexes for better performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_region_id ON users(region_id)
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_district_id ON users(district_id)
    `);
    
    console.log('✅ Created indexes for region_id and district_id');
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateRegionDistrict()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateRegionDistrict;

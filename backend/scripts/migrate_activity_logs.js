const { query } = require('../config/database');

async function migrateActivityLogs() {
  try {
    console.log('🔄 Starting activity_logs table migration...');
    
    // Add branch_id column
    console.log('📝 Adding branch_id column...');
    await query(`
      ALTER TABLE activity_logs 
      ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL
    `);
    
    // Add entity_type column
    console.log('📝 Adding entity_type column...');
    await query(`
      ALTER TABLE activity_logs 
      ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50)
    `);
    
    // Add entity_id column
    console.log('📝 Adding entity_id column...');
    await query(`
      ALTER TABLE activity_logs 
      ADD COLUMN IF NOT EXISTS entity_id UUID
    `);
    
    // Add indexes
    console.log('📝 Adding indexes...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_branch_id ON activity_logs(branch_id)
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs(entity_type)
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_id ON activity_logs(entity_id)
    `);
    
    console.log('✅ Activity logs migration completed successfully!');
    
    // Test the table structure
    console.log('🔍 Testing table structure...');
    const result = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'activity_logs' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Current activity_logs table structure:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

migrateActivityLogs();






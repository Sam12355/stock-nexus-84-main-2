const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

async function runMigration() {
  try {
    console.log('🔄 Starting moveout lists table migration...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create_moveout_lists_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await query(sql);
    
    console.log('✅ Moveout lists table created successfully!');
    
    // Verify the table was created
    const result = await query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'moveout_lists' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Table structure:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

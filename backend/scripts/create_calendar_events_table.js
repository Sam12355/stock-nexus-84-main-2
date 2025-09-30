const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'stock_nexus',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function createCalendarEventsTable() {
  try {
    console.log('🔄 Creating calendar_events table...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create_calendar_events_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('✅ calendar_events table created successfully!');
    
    // Verify the table was created
    const result = await pool.query(`
      SELECT COUNT(*) as count 
      FROM calendar_events
    `);
    
    console.log(`📊 Sample events inserted: ${result.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error creating calendar_events table:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
createCalendarEventsTable()
  .then(() => {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });

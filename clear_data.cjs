const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'stock_nexus',
  user: 'postgres',
  password: 'password',
  ssl: false,
});

async function clearMoveoutData() {
  try {
    console.log('🔍 Connecting to database...');
    
    // Clear all moveout lists
    const result = await pool.query('DELETE FROM moveout_lists');
    console.log(`✅ Cleared ${result.rowCount} moveout lists`);
    
    console.log('🎉 All moveout data cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing data:', error.message);
    process.exit(1);
  }
}

clearMoveoutData();

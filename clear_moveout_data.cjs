const { Pool } = require('pg');

// Use the same database configuration as the backend
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
    
    // Reset the sequence
    await pool.query('ALTER SEQUENCE moveout_lists_id_seq RESTART WITH 1');
    console.log('✅ Reset moveout_lists sequence');
    
    console.log('🎉 All moveout data cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing data:', error.message);
    process.exit(1);
  }
}

clearMoveoutData();

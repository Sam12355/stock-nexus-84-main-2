const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'stock_nexus',
  password: 'postgres',
  port: 5432,
});

async function checkInactiveUsers() {
  try {
    // Check for inactive users with lak@stocknexus.com
    const result = await pool.query(
      'SELECT id, email, name, is_active FROM users WHERE email = $1',
      ['lak@stocknexus.com']
    );
    
    console.log('Users with email lak@stocknexus.com:');
    console.log(result.rows);
    
    // Check all inactive users
    const inactiveResult = await pool.query(
      'SELECT id, email, name, is_active FROM users WHERE is_active = false'
    );
    
    console.log('\nAll inactive users:');
    console.log(inactiveResult.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkInactiveUsers();

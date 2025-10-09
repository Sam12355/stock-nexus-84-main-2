const { query } = require('./backend/config/database');

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Database connected:', result.rows[0]);
    
    // Check if users table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    console.log('📊 Users table exists:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Check if there are any users
      const userCount = await query('SELECT COUNT(*) as count FROM users');
      console.log('👥 Total users:', userCount.rows[0].count);
      
      if (userCount.rows[0].count === '0') {
        console.log('⚠️ No users found. Running seed script...');
        // Run seed script
        require('./backend/scripts/seed.js');
      }
    } else {
      console.log('❌ Users table does not exist. Running migration...');
      // Run migration
      require('./backend/scripts/migrate.js');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error);
  }
}

testDatabase();

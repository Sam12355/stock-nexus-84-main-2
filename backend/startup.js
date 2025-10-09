const { execSync } = require('child_process');
const { query } = require('./config/database');

async function startup() {
  try {
    console.log('🚀 Starting Stock Nexus Backend...');
    
    // Wait a moment for database to be ready
    console.log('⏳ Waiting for database connection...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test database connection
    console.log('🔍 Testing database connection...');
    await query('SELECT NOW() as current_time');
    console.log('✅ Database connected');
    
    // Check if users table exists
    console.log('📊 Checking if users table exists...');
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('📊 Running database migration...');
      execSync('node scripts/migrate.js', { stdio: 'inherit' });
      console.log('✅ Migration completed');
    } else {
      console.log('✅ Users table already exists');
    }
    
    // Check if there are any users
    console.log('👥 Checking if users exist...');
    const userCount = await query('SELECT COUNT(*) as count FROM users');
    const count = parseInt(userCount.rows[0].count);
    
    if (count === 0) {
      console.log('🌱 No users found, running seed...');
      execSync('node scripts/seed.js', { stdio: 'inherit' });
      console.log('✅ Seed completed');
    } else {
      console.log(`👥 Found ${count} users, skipping seed`);
    }
    
    // Start the server
    console.log('🚀 Starting server...');
    require('./server.js');
    
  } catch (error) {
    console.error('❌ Startup error:', error);
    process.exit(1);
  }
}

startup();

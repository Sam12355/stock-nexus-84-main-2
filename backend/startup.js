const { execSync } = require('child_process');
const { query } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function startup() {
  try {
    console.log('🚀 Starting Stock Nexus Backend...');
    
    // Wait a moment for database to be ready
    console.log('⏳ Waiting for database connection...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
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
      console.log('📊 No tables found, importing complete backup...');
      
      // Check if backup file exists (try both locations)
      let backupPath = path.join(__dirname, 'stock_nexus_complete_backup_20251008_032316.sql');
      if (!fs.existsSync(backupPath)) {
        backupPath = path.join(__dirname, '..', 'stock_nexus_complete_backup_20251008_032316.sql');
      }
      if (fs.existsSync(backupPath)) {
        console.log('📥 Found backup file, importing data...');
        
        // Import the complete backup
        const { Client } = require('pg');
        const client = new Client({
          host: process.env.DB_HOST,
          port: process.env.DB_PORT,
          database: process.env.DB_NAME,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
        });
        
        await client.connect();
        
        // Read and execute the backup file
        const backupSQL = fs.readFileSync(backupPath, 'utf8');
        
        // Split the SQL into individual statements and execute them
        const statements = backupSQL
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`📝 Executing ${statements.length} SQL statements...`);
        
        for (let i = 0; i < statements.length; i++) {
          try {
            if (statements[i].trim()) {
              await client.query(statements[i]);
            }
          } catch (error) {
            // Skip errors for statements that might already exist
            if (!error.message.includes('already exists') && 
                !error.message.includes('does not exist')) {
              console.warn(`⚠️ Warning executing statement ${i + 1}:`, error.message);
            }
          }
        }
        
        await client.end();
        console.log('✅ Complete backup imported successfully');
      } else {
        console.log('⚠️ Backup file not found, running migration...');
        execSync('node scripts/migrate.js', { stdio: 'inherit' });
        console.log('✅ Migration completed');
      }
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

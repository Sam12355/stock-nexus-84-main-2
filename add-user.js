const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'stock_nexus',
  user: process.env.DB_USER || process.env.USER || 'khalifainternationalaward',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

async function addUser() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔍 Adding user aa@aa.com...');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('Lakshan12355@', 12);
    
    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', ['aa@aa.com']);
    
    if (existingUser.rows.length > 0) {
      console.log('✅ User already exists, updating password...');
      await pool.query(
        'UPDATE users SET password_hash = $1, name = $2, role = $3 WHERE email = $4',
        [hashedPassword, 'Lakshan Admin', 'admin', 'aa@aa.com']
      );
    } else {
      console.log('➕ Creating new user...');
      await pool.query(
        'INSERT INTO users (email, password_hash, name, role, phone, position) VALUES ($1, $2, $3, $4, $5, $6)',
        ['aa@aa.com', hashedPassword, 'Lakshan Admin', 'admin', '+1234567890', 'System Admin']
      );
    }
    
    console.log('✅ User aa@aa.com added/updated successfully!');
    
    // Test login
    console.log('🔍 Testing login...');
    const testUser = await pool.query('SELECT id, email, name, role FROM users WHERE email = $1', ['aa@aa.com']);
    console.log('👤 User details:', testUser.rows[0]);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addUser();

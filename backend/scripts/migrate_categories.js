const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'stock_nexus',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

async function migrateCategories() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔄 Starting category migration...');
    
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'update_categories.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the migration
    await pool.query(sqlContent);
    
    console.log('✅ Category migration completed successfully!');
    console.log('📋 Updated categories:');
    console.log('   - Fish Frozen');
    console.log('   - Vegetables');
    console.log('   - Other Frozen Food');
    console.log('   - Meat Frozen');
    console.log('   - Kitchen Supplies');
    console.log('   - Grains');
    console.log('   - Fruits');
    console.log('   - Flour');
    console.log('   - Cleaning Supplies');
    console.log('   - Canned & Prepared Food');
    console.log('   - Beer, non alc.');
    console.log('   - SY Product Recipes');
    console.log('   - Packaging');
    console.log('   - Sauce');
    console.log('   - Softdrinks');
    console.log('   - Spices');
    console.log('   - Other');
    
  } catch (error) {
    console.error('❌ Error during category migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
migrateCategories();





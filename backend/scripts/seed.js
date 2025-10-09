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

async function seedDatabase() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🌱 Starting database seeding...');
    
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 12);
    await pool.query(
      'INSERT INTO users (email, password_hash, name, role, phone, position) VALUES ($1, $2, $3, $4, $5, $6)',
      ['admin@stocknexus.com', adminPassword, 'System Administrator', 'admin', '+1234567890', 'System Admin']
    );
    
    // Create Lakshan's user
    const lakshanPassword = await bcrypt.hash('Lakshan12355@', 12);
    await pool.query(
      'INSERT INTO users (email, password_hash, name, role, phone, position) VALUES ($1, $2, $3, $4, $5, $6)',
      ['aa@aa.com', lakshanPassword, 'Lakshan Admin', 'admin', '+1234567890', 'System Admin']
    );
    
    // Create sample region
    const regionResult = await pool.query(
      'INSERT INTO regions (name, description) VALUES ($1, $2) RETURNING id',
      ['North Region', 'Northern region of operations']
    );
    
    // Create sample district
    const districtResult = await pool.query(
      'INSERT INTO districts (name, region_id, description) VALUES ($1, $2, $3) RETURNING id',
      ['Central District', regionResult.rows[0]?.id, 'Central district in north region']
    );
    
    // Create sample branch
    const branchResult = await pool.query(
      'INSERT INTO branches (name, district_id, address, phone, email, manager_name) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      ['Main Branch', districtResult.rows[0]?.id, '123 Main Street, City', '+1234567891', 'main@stocknexus.com', 'John Manager']
    );
    
    // Create sample manager
    const managerPassword = await bcrypt.hash('manager123', 12);
    await pool.query(
      'INSERT INTO users (email, password_hash, name, role, phone, position, branch_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      ['manager@stocknexus.com', managerPassword, 'John Manager', 'manager', '+1234567892', 'Branch Manager', branchResult.rows[0]?.id]
    );
    
    // Create sample staff
    const staffPassword = await bcrypt.hash('staff123', 12);
    await pool.query(
      'INSERT INTO users (email, password_hash, name, role, phone, position, branch_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      ['staff@stocknexus.com', staffPassword, 'Jane Staff', 'staff', '+1234567893', 'Inventory Staff', branchResult.rows[0]?.id]
    );
    
    // Create sample items
    const sampleItems = [
      { name: 'Rice 1kg', category: 'dry_goods', description: 'Premium quality rice', threshold_level: 50 },
      { name: 'Cooking Oil 1L', category: 'dry_goods', description: 'Vegetable cooking oil', threshold_level: 30 },
      { name: 'Frozen Chicken', category: 'frozen_items', description: 'Fresh frozen chicken', threshold_level: 20, storage_temperature: -18 },
      { name: 'Plastic Bags', category: 'packaging', description: 'Small plastic bags', threshold_level: 100 },
      { name: 'Cleaning Detergent', category: 'cleaning_supplies', description: 'Multi-purpose cleaner', threshold_level: 25 }
    ];
    
    for (const item of sampleItems) {
      await pool.query(
        'INSERT INTO items (name, category, description, threshold_level, storage_temperature, branch_id) VALUES ($1, $2, $3, $4, $5, $6)',
        [item.name, item.category, item.description, item.threshold_level, item.storage_temperature || null, branchResult.rows[0]?.id]
      );
    }
    
    console.log('✅ Database seeding completed successfully!');
    console.log('👤 Sample users created:');
    console.log('   - admin@stocknexus.com (password: admin123)');
    console.log('   - manager@stocknexus.com (password: manager123)');
    console.log('   - staff@stocknexus.com (password: staff123)');
    console.log('📦 Sample items and branches created');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;

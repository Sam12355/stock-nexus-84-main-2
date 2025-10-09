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
            'INSERT INTO users (email, password_hash, name, role, phone, position) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO UPDATE SET password_hash = $2, name = $3, role = $4',
            ['aa@aa.com', lakshanPassword, 'Lakshan Admin', 'admin', '+1234567890', 'System Admin']
          );
    
    // Create sample regions
    const regions = [
      { name: 'North Region', description: 'Northern region of operations' },
      { name: 'South Region', description: 'Southern region of operations' },
      { name: 'East Region', description: 'Eastern region of operations' },
      { name: 'West Region', description: 'Western region of operations' }
    ];
    
    const regionIds = [];
    for (const region of regions) {
      const result = await pool.query(
        'INSERT INTO regions (name, description) VALUES ($1, $2) RETURNING id',
        [region.name, region.description]
      );
      regionIds.push(result.rows[0].id);
    }
    
    // Create sample districts
    const districts = [
      { name: 'Central District', region_id: regionIds[0], description: 'Central district in north region' },
      { name: 'Downtown District', region_id: regionIds[0], description: 'Downtown district in north region' },
      { name: 'Suburban District', region_id: regionIds[1], description: 'Suburban district in south region' },
      { name: 'Coastal District', region_id: regionIds[1], description: 'Coastal district in south region' },
      { name: 'Industrial District', region_id: regionIds[2], description: 'Industrial district in east region' },
      { name: 'Business District', region_id: regionIds[3], description: 'Business district in west region' }
    ];
    
    const districtIds = [];
    for (const district of districts) {
      const result = await pool.query(
        'INSERT INTO districts (name, region_id, description) VALUES ($1, $2, $3) RETURNING id',
        [district.name, district.region_id, district.description]
      );
      districtIds.push(result.rows[0].id);
    }
    
    // Create sample branches
    const branches = [
      { name: 'Main Branch', district_id: districtIds[0], address: '123 Main Street, Central City', phone: '+1234567891', email: 'main@stocknexus.com', manager_name: 'John Manager' },
      { name: 'Downtown Branch', district_id: districtIds[1], address: '456 Downtown Ave, Central City', phone: '+1234567892', email: 'downtown@stocknexus.com', manager_name: 'Sarah Johnson' },
      { name: 'Suburban Branch', district_id: districtIds[2], address: '789 Suburban Rd, Suburbia', phone: '+1234567893', email: 'suburban@stocknexus.com', manager_name: 'Mike Wilson' },
      { name: 'Coastal Branch', district_id: districtIds[3], address: '321 Coastal Blvd, Seaside', phone: '+1234567894', email: 'coastal@stocknexus.com', manager_name: 'Lisa Brown' },
      { name: 'Industrial Branch', district_id: districtIds[4], address: '654 Industrial Park, Factory City', phone: '+1234567895', email: 'industrial@stocknexus.com', manager_name: 'David Lee' },
      { name: 'Business Branch', district_id: districtIds[5], address: '987 Business Center, Commerce City', phone: '+1234567896', email: 'business@stocknexus.com', manager_name: 'Emma Davis' }
    ];
    
    const branchIds = [];
    for (const branch of branches) {
      const result = await pool.query(
        'INSERT INTO branches (name, district_id, address, phone, email, manager_name) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [branch.name, branch.district_id, branch.address, branch.phone, branch.email, branch.manager_name]
      );
      branchIds.push(result.rows[0].id);
    }
    
    // Create sample manager
    const managerPassword = await bcrypt.hash('manager123', 12);
    await pool.query(
      'INSERT INTO users (email, password_hash, name, role, phone, position, branch_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      ['manager@stocknexus.com', managerPassword, 'John Manager', 'manager', '+1234567892', 'Branch Manager', branchIds[0]]
    );
    
    // Create sample staff members for different branches
    const staffMembers = [
      { email: 'staff1@stocknexus.com', name: 'Alice Smith', branch_id: branchIds[0], position: 'Sales Associate' },
      { email: 'staff2@stocknexus.com', name: 'Bob Johnson', branch_id: branchIds[1], position: 'Inventory Clerk' },
      { email: 'staff3@stocknexus.com', name: 'Carol Davis', branch_id: branchIds[2], position: 'Customer Service' },
      { email: 'staff4@stocknexus.com', name: 'David Wilson', branch_id: branchIds[3], position: 'Warehouse Assistant' },
      { email: 'staff5@stocknexus.com', name: 'Eva Brown', branch_id: branchIds[4], position: 'Sales Representative' },
      { email: 'staff6@stocknexus.com', name: 'Frank Miller', branch_id: branchIds[5], position: 'Operations Assistant' }
    ];
    
    const staffPassword = await bcrypt.hash('staff123', 12);
    for (const staff of staffMembers) {
      await pool.query(
        'INSERT INTO users (email, password_hash, name, role, phone, position, branch_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [staff.email, staffPassword, staff.name, 'staff', '+1234567890', staff.position, staff.branch_id]
      );
    }
    
    
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
        [item.name, item.category, item.description, item.threshold_level, item.storage_temperature || null, branchIds[0]]
      );
    }
    
    console.log('✅ Database seeding completed successfully!');
    console.log('👤 Sample users created:');
    console.log('   - aa@aa.com (password: Lakshan12355@) - Admin');
    console.log('   - admin@stocknexus.com (password: admin123) - Admin');
    console.log('   - manager@stocknexus.com (password: manager123) - Manager');
    console.log('   - staff1@stocknexus.com (password: staff123) - Staff');
    console.log('   - staff2@stocknexus.com (password: staff123) - Staff');
    console.log('   - staff3@stocknexus.com (password: staff123) - Staff');
    console.log('   - staff4@stocknexus.com (password: staff123) - Staff');
    console.log('   - staff5@stocknexus.com (password: staff123) - Staff');
    console.log('   - staff6@stocknexus.com (password: staff123) - Staff');
    console.log('🏢 Sample data created:');
    console.log('   - 4 regions, 6 districts, 6 branches');
    console.log('   - 5 sample items');
    
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

import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'stock_nexus',
  user: process.env.DB_USER || process.env.USER || 'khalifainternationalaward',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

const pool = new Pool(dbConfig);

async function checkUserBranchLocation() {
  try {
    console.log('🔍 Checking branch location for user: aa@aa.com');

    // First, check what columns exist in the branches table
    console.log('🔍 Checking branches table structure...');
    const columnsQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'branches'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    const columnsResult = await pool.query(columnsQuery);
    console.log('🏗️ Branches table columns:', columnsResult.rows.map(row => row.column_name));

    // First, find the user and their branch information
    const userQuery = `
      SELECT u.id, u.email, u.name, u.branch_id, u.branch_context,
             b.name as branch_name, b.address as branch_address,
             d.name as district_name, r.name as region_name
      FROM users u
      LEFT JOIN branches b ON (u.branch_id = b.id OR u.branch_context = b.id)
      LEFT JOIN districts d ON b.district_id = d.id
      LEFT JOIN regions r ON d.region_id = r.id
      WHERE u.email = 'aa@aa.com'
    `;

    const userResult = await pool.query(userQuery);

    if (userResult.rows.length === 0) {
      console.log('❌ User aa@aa.com not found in database');
      return;
    }

    const user = userResult.rows[0];
    console.log('👤 User Info:');
    console.log('   - ID:', user.id);
    console.log('   - Name:', user.name);
    console.log('   - Email:', user.email);
    console.log('   - Branch ID:', user.branch_id);
    console.log('   - Branch Context:', user.branch_context);
    console.log('   - Branch Name:', user.branch_name);
    console.log('   - Branch Address:', user.branch_address || 'NULL');
    console.log('   - District:', user.district_name);
    console.log('   - Region:', user.region_name);

    // Also check all branches to see what information exists
    console.log('\n🏢 All Branches:');
    const branchesQuery = `
      SELECT b.id, b.name, b.address, d.name as district, r.name as region
      FROM branches b
      LEFT JOIN districts d ON b.district_id = d.id
      LEFT JOIN regions r ON d.region_id = r.id
      ORDER BY b.name
    `;

    const branchesResult = await pool.query(branchesQuery);
    branchesResult.rows.forEach(branch => {
      console.log(`   - ${branch.name}: ${branch.address || 'No address set'} (${branch.district}, ${branch.region})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUserBranchLocation();
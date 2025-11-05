// Migration script to add Unit of Measurement fields to items table
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Clear DATABASE_URL to prevent it from overriding explicit config
if (process.env.DATABASE_URL) {
  delete process.env.DATABASE_URL;
}

// Use the same config as database.js
const isSupabase = process.env.DB_HOST?.includes('supabase.co');

const dbConfig = isSupabase 
  ? {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'stock_nexus',
      user: process.env.DB_USER || process.env.USER || 'khalifainternationalaward',
      password: process.env.DB_PASSWORD || '',
      ssl: false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

console.log('Database config:', { ...dbConfig, password: dbConfig.password ? '***' : undefined });

const pool = new Pool(dbConfig);

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting Unit of Measurement migration...');
    
    await client.query('BEGIN');
    
    // Add new columns
    console.log('Adding UoM columns to items table...');
    await client.query(`
      ALTER TABLE items 
      ADD COLUMN IF NOT EXISTS base_unit VARCHAR(50) DEFAULT 'piece',
      ADD COLUMN IF NOT EXISTS packaging_unit VARCHAR(50),
      ADD COLUMN IF NOT EXISTS units_per_package INTEGER,
      ADD COLUMN IF NOT EXISTS enable_packaging BOOLEAN DEFAULT false
    `);
    
    // Update existing items
    console.log('Setting default values for existing items...');
    await client.query(`
      UPDATE items 
      SET base_unit = 'piece', 
          enable_packaging = false 
      WHERE base_unit IS NULL
    `);
    
    // Add check constraint
    console.log('Adding validation constraints...');
    await client.query(`
      ALTER TABLE items 
      DROP CONSTRAINT IF EXISTS items_units_per_package_check
    `);
    
    await client.query(`
      ALTER TABLE items 
      ADD CONSTRAINT items_units_per_package_check 
      CHECK (units_per_package IS NULL OR units_per_package > 0)
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ Unit of Measurement migration completed successfully!');
    
    // Verify the changes
    const result = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'items' 
      AND column_name IN ('base_unit', 'packaging_unit', 'units_per_package', 'enable_packaging')
      ORDER BY column_name
    `);
    
    console.log('\n📋 New columns added:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('\n✨ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = runMigration;

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'stock_nexus',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function createStockReceiptsTable() {
  try {
    console.log('🔧 Creating stock_receipts table...');
    
    const sql = `
      -- Create stock_receipts table
      CREATE TABLE IF NOT EXISTS stock_receipts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          supplier_name VARCHAR(255) NOT NULL,
          receipt_file_path VARCHAR(500) NOT NULL,
          receipt_file_name VARCHAR(255) NOT NULL,
          remarks TEXT,
          status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
          submitted_by UUID REFERENCES users(id) ON DELETE CASCADE,
          reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
          branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          reviewed_at TIMESTAMP WITH TIME ZONE
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_stock_receipts_status ON stock_receipts(status);
      CREATE INDEX IF NOT EXISTS idx_stock_receipts_submitted_by ON stock_receipts(submitted_by);
      CREATE INDEX IF NOT EXISTS idx_stock_receipts_branch_id ON stock_receipts(branch_id);
      CREATE INDEX IF NOT EXISTS idx_stock_receipts_created_at ON stock_receipts(created_at);

      -- Add comment
      COMMENT ON TABLE stock_receipts IS 'Stores stock receipt submissions from staff for manager review';
    `;

    await pool.query(sql);
    console.log('✅ stock_receipts table created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating stock_receipts table:', error);
  } finally {
    await pool.end();
  }
}

createStockReceiptsTable();






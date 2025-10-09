const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Initialize database (no auth required for initial setup)
router.post('/init-database', async (req, res) => {
  try {
    console.log('🚀 Initializing database...');
    
    // Check if users table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('📊 Running migration...');
      // Import and run migration
      const migrate = require('../scripts/migrate');
      await migrate.runMigration();
    }
    
    // Check if there are any users
    const userCount = await query('SELECT COUNT(*) as count FROM users');
    console.log('👥 Total users:', userCount.rows[0].count);
    
    if (userCount.rows[0].count === '0') {
      console.log('🌱 Running seed script...');
      // Import and run seed
      const seed = require('../scripts/seed');
      await seed.runSeed();
    }
    
    res.json({
      success: true,
      message: 'Database initialized successfully',
      usersCount: userCount.rows[0].count
    });
    
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    res.status(500).json({
      success: false,
      error: 'Database initialization failed',
      details: error.message
    });
  }
});

// Create district manager branch assignments table
router.post('/create-dm-branch-assignments-table', authenticateToken, async (req, res) => {
  try {
    // Only admins and regional managers can run this setup
    if (req.user.role !== 'admin' && req.user.role !== 'regional_manager') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin or regional manager privileges required.'
      });
    }

    console.log('🔧 Creating district_manager_branch_assignments table...');
    
    // Create the table
    await query(`
      CREATE TABLE IF NOT EXISTS district_manager_branch_assignments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        district_manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
        assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(district_manager_id, branch_id)
      )
    `);

    // Create indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_dm_branch_assignments_dm_id 
      ON district_manager_branch_assignments(district_manager_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_dm_branch_assignments_branch_id 
      ON district_manager_branch_assignments(branch_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_dm_branch_assignments_assigned_by 
      ON district_manager_branch_assignments(assigned_by)
    `);

    // Add comment
    await query(`
      COMMENT ON TABLE district_manager_branch_assignments IS 
      'Stores which branches each district manager can access/manage'
    `);

    console.log('✅ district_manager_branch_assignments table created successfully!');
    
    // Check if table exists
    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'district_manager_branch_assignments'
    `);
    
    if (result.rows.length > 0) {
      res.json({
        success: true,
        message: 'district_manager_branch_assignments table created successfully!',
        table_exists: true
      });
    } else {
      res.json({
        success: false,
        message: 'Table creation may have failed',
        table_exists: false
      });
    }
    
  } catch (error) {
    console.error('❌ Error creating table:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create table',
      details: error.message
    });
  }
});

// Create stock receipts table
router.post('/create-stock-receipts-table', authenticateToken, async (req, res) => {
  try {
    // Only admins can run this setup
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin privileges required.'
      });
    }

    console.log('🔧 Creating stock_receipts table...');
    
    // Create the table
    await query(`
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
      )
    `);

    // Create indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_stock_receipts_status 
      ON stock_receipts(status)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_stock_receipts_submitted_by 
      ON stock_receipts(submitted_by)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_stock_receipts_branch_id 
      ON stock_receipts(branch_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_stock_receipts_created_at 
      ON stock_receipts(created_at)
    `);

    // Add comment
    await query(`
      COMMENT ON TABLE stock_receipts IS 'Stores stock receipt submissions from staff for manager review'
    `);

    console.log('✅ stock_receipts table created successfully!');

    res.json({
      success: true,
      message: 'stock_receipts table created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating stock_receipts table:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create stock_receipts table',
      details: error.message
    });
  }
});

// Update item categories (temporary - no auth required for migration)
router.post('/update-categories', async (req, res) => {
  try {
    // Temporarily allow anyone to run this migration
    console.log('🔄 Running category migration (no auth required)...');

    console.log('🔄 Starting category migration...');
    
    // Drop the existing constraint
    await query(`
      ALTER TABLE items DROP CONSTRAINT IF EXISTS items_category_check
    `);

    // Add the new constraint with updated categories
    await query(`
      ALTER TABLE items ADD CONSTRAINT items_category_check 
      CHECK (category IN (
        'fish_frozen',
        'vegetables', 
        'other_frozen_food',
        'meat_frozen',
        'kitchen_supplies',
        'grains',
        'fruits',
        'flour',
        'cleaning_supplies',
        'canned_prepared_food',
        'beer_non_alc',
        'sy_product_recipes',
        'packaging',
        'sauce',
        'softdrinks',
        'spices',
        'other'
      ))
    `);

    // Update existing items to use new categories
    await query(`
      UPDATE items SET category = 'other_frozen_food' WHERE category = 'frozen_items'
    `);

    await query(`
      UPDATE items SET category = 'grains' WHERE category = 'dry_goods'
    `);

    await query(`
      UPDATE items SET category = 'other' WHERE category = 'misc'
    `);

    console.log('✅ Category migration completed successfully!');

    res.json({
      success: true,
      message: 'Item categories updated successfully',
      newCategories: [
        'Fish Frozen',
        'Vegetables',
        'Other Frozen Food',
        'Meat Frozen',
        'Kitchen Supplies',
        'Grains',
        'Fruits',
        'Flour',
        'Cleaning Supplies',
        'Canned & Prepared Food',
        'Beer, non alc.',
        'SY Product Recipes',
        'Packaging',
        'Sauce',
        'Softdrinks',
        'Spices',
        'Other'
      ]
    });

  } catch (error) {
    console.error('Error updating categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update categories'
    });
  }
});

// Create moveout lists table
router.post('/create-moveout-lists-table', async (req, res) => {
  try {
    console.log('🔄 Creating moveout lists table...');
    
    // Create the table
    await query(`
      CREATE TABLE IF NOT EXISTS moveout_lists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL DEFAULT 'Moveout List',
        description TEXT,
        items JSONB NOT NULL,
        generated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_moveout_lists_generated_by ON moveout_lists(generated_by);
      CREATE INDEX IF NOT EXISTS idx_moveout_lists_branch_id ON moveout_lists(branch_id);
      CREATE INDEX IF NOT EXISTS idx_moveout_lists_status ON moveout_lists(status);
      CREATE INDEX IF NOT EXISTS idx_moveout_lists_created_at ON moveout_lists(created_at);
    `);

    // Add comments
    await query(`
      COMMENT ON TABLE moveout_lists IS 'Stores generated moveout lists with their items and metadata';
      COMMENT ON COLUMN moveout_lists.items IS 'JSON array of items with their details (itemId, itemName, currentQuantity, requestingQuantity)';
      COMMENT ON COLUMN moveout_lists.status IS 'Status of the moveout list: active, completed, or cancelled';
    `);

    console.log('✅ Moveout lists table created successfully!');

    res.json({
      success: true,
      message: 'Moveout lists table created successfully'
    });

  } catch (error) {
    console.error('Error creating moveout lists table:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create moveout lists table'
    });
  }
});

module.exports = router;

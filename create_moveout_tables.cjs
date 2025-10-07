const { query } = require('./backend/config/database');

async function createTables() {
  try {
    console.log('🔧 Creating moveout lists tables...');
    
    // Create moveout_lists table
    await query(`
      CREATE TABLE IF NOT EXISTS moveout_lists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
        branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
        generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create moveout_list_items table
    await query(`
      CREATE TABLE IF NOT EXISTS moveout_list_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        moveout_list_id UUID REFERENCES moveout_lists(id) ON DELETE CASCADE,
        item_id UUID REFERENCES items(id) ON DELETE CASCADE,
        item_name VARCHAR(255) NOT NULL,
        current_quantity INTEGER NOT NULL,
        requesting_quantity INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_moveout_lists_generated_by ON moveout_lists(generated_by)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_moveout_lists_branch_id ON moveout_lists(branch_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_moveout_lists_generated_at ON moveout_lists(generated_at)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_moveout_list_items_moveout_list_id ON moveout_list_items(moveout_list_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_moveout_list_items_status ON moveout_list_items(status)`);

    console.log('✅ Moveout lists tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
}

createTables();

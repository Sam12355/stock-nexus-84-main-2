const { query } = require('./backend/config/database');

async function createTable() {
  try {
    console.log('🔄 Creating moveout_lists table...');
    
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

    console.log('✅ Moveout lists table created successfully!');

  } catch (error) {
    console.error('❌ Error creating table:', error);
  }
}

createTable().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});





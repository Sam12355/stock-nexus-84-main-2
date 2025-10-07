const { query } = require('../config/database');

async function createDistrictManagerBranchAssignmentsTable() {
  try {
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
      console.log('✅ Table verification successful');
    } else {
      console.log('❌ Table verification failed');
    }
    
  } catch (error) {
    console.error('❌ Error creating table:', error);
    throw error;
  }
}

// Run the migration
createDistrictManagerBranchAssignmentsTable()
  .then(() => {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });






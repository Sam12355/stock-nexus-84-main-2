const { query } = require('./config/database');

async function runMigrationAndTest() {
  try {
    console.log('🚀 Running FCM token migration...\n');
    
    // Add fcm_token column
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;
    `);
    console.log('✅ Added fcm_token column to users table\n');
    
    // Add index
    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_fcm_token ON users(fcm_token) WHERE fcm_token IS NOT NULL;
    `);
    console.log('✅ Created index on fcm_token column\n');
    
    // Add comment
    await query(`
      COMMENT ON COLUMN users.fcm_token IS 'Firebase Cloud Messaging token for push notifications to mobile app';
    `);
    console.log('✅ Added column comment\n');
    
    // Update Jaber's FCM token (local database user)
    const testToken = 'de-QEuXRTcmPyLQ0MKRA3P:APA91bE8DWGMhab_uj5fAqCb-PG4i3FVfx2HjH3THfUDMh70m6cq7_swg2dv1GApk3qptP4AjzcdUCMDZ3SOovtsgdYPyv-Evy7XaG9JDjUtQRNPCZcNCbo';
    
    const result = await query(
      `UPDATE users SET fcm_token = $1, updated_at = NOW() WHERE email = $2 RETURNING id, email, name`,
      [testToken, 'aa@aa.com']
    );
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('✅ Updated FCM token for Jaber Ahmed:');
      console.log(`   User ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Token: ${testToken.substring(0, 50)}...`);
      console.log('\n✅ FCM setup complete! Ready to test push notifications.');
      console.log('\n📱 To test:');
      console.log('   1. Make sure Jaber has the Android app running');
      console.log('   2. Trigger a stock alert by lowering an item quantity below threshold');
      console.log('   3. Push notification should appear within 2 seconds!');
    } else {
      console.log('❌ User not found with email: aa@aa.com');
      console.log('   Please check the email address in the database');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrationAndTest();

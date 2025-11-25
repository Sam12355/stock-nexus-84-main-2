const admin = require('./config/firebase');

async function testFCMNotificationDetailed() {
  console.log('\n🔍 Testing FCM Configuration...\n');
  
  // Check if Firebase is initialized
  try {
    const app = admin.app();
    console.log('✅ Firebase app initialized:', app.name);
  } catch (error) {
    console.error('❌ Firebase not initialized:', error.message);
    return;
  }

  const testToken = 'fBRKoQheSDeu_9Fb1XDFb9:APA91bH78DsSNj96wCi2USg0ssrObkLCCzu-u-3Bw-38fM68zKTzZvWt2HmWPcuafM51S3CoQflcwr36QJlDdqe5sj1PaBUEZVCKh9nAtehXqQYYlgCoE1Q';
  
  console.log('📱 Testing with token:', testToken.substring(0, 30) + '...\n');

  const message = {
    token: testToken,
    data: {  // DATA ONLY - no notification field so FCMService handles it!
      title: '⚠️ Stock Alert',
      body: `📉 STOCK ALERT - LOW LEVEL\n\n📦 Item: Guruka\n📊 Current Stock: 4\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: ${new Date().toLocaleString()}`,
      type: 'stock_alert',
      notification_id: '123',
      item_name: 'Guruka',
      current_quantity: '4',
      threshold: '10',
      timestamp: new Date().toISOString(),
    },
    android: {
      priority: 'high',
    },
  };
  
  console.log('📤 Sending notification...\n');
  
  try {
    const response = await admin.messaging().send(message);
    console.log('✅ Notification sent successfully!');
    console.log('📨 Message ID:', response);
    console.log('\n✨ Check your Android device now!\n');
  } catch (error) {
    console.error('❌ Failed to send notification\n');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    
    if (error.code === 'messaging/invalid-registration-token') {
      console.error('\n⚠️  The FCM token is invalid or expired.');
      console.error('💡 Solution: Get a fresh token from your Android app and update it.');
    } else if (error.code === 'messaging/registration-token-not-registered') {
      console.error('\n⚠️  The token is not registered with FCM.');
      console.error('💡 Solution: Make sure the Android app is properly configured with Firebase.');
    } else if (error.code === 'messaging/invalid-argument') {
      console.error('\n⚠️  Invalid message format.');
      console.error('💡 Check the message structure.');
    }
    
    console.error('\nFull error details:', JSON.stringify(error, null, 2));
  }
}

testFCMNotificationDetailed();

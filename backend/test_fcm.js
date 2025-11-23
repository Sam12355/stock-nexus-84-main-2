const admin = require('./config/firebase');

// Test function - call this manually
async function testFCMNotification() {
  const message = {
    token: 'de-QEuXRTcmPyLQ0MKRA3P:APA91bE8DWGMhab_uj5fAqCb-PG4i3FVfx2HjH3THfUDMh70m6cq7_swg2dv1GApk3qptP4AjzcdUCMDZ3SOovtsgdYPyv-Evy7XaG9JDjUtQRNPCZcNCbo',
    notification: {
      title: 'Test Stock Alert',
      body: 'This is a test notification from FCM',
    },
    data: {
      type: 'stock_alert',
      notification_id: '123',
      item_name: 'Test Item',
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'stock_alerts',
        sound: 'default',
      },
    },
  };
  
  try {
    const response = await admin.messaging().send(message);
    console.log('✅ FCM notification sent successfully:', response);
  } catch (error) {
    console.error('❌ Error sending FCM notification:', error.message);
    console.error('Full error:', error);
  }
}

testFCMNotification();

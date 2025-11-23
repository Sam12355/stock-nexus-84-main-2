const admin = require('../config/firebase');
const db = require('../config/database');

/**
 * Send stock alert push notification to a user
 * @param {string} userId - User ID to send notification to
 * @param {object} stockAlert - Stock alert details
 * @returns {Promise<string|null>} - FCM response or null if failed
 */
async function sendStockAlertNotification(userId, stockAlert) {
  try {
    // Get user's FCM token from database
    const result = await db.query(
      'SELECT fcm_token, name FROM users WHERE id = $1',
      [userId]
    );
    
    const user = result.rows[0];
    if (!user?.fcm_token) {
      console.log(`⚠️ No FCM token for user: ${userId}`);
      return null;
    }

    const fcmToken = user.fcm_token;
    const userName = user.name || 'User';

    // Prepare notification message
    const message = {
      token: fcmToken,
      notification: {
        title: '⚠️ Stock Alert',
        body: `${stockAlert.item_name} is below threshold (${stockAlert.current_quantity} remaining)`,
      },
      data: {
        type: 'stock_alert',
        notification_id: String(stockAlert.id || ''),
        item_id: String(stockAlert.item_id || ''),
        item_name: String(stockAlert.item_name || ''),
        current_quantity: String(stockAlert.current_quantity || 0),
        threshold: String(stockAlert.threshold || 0),
        timestamp: new Date().toISOString(),
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'stock_alerts',
          sound: 'default',
          color: '#FF6B35',
          tag: `stock_${stockAlert.item_id}`, // Replaces old notification for same item
        },
      },
    };

    // Send FCM notification
    const response = await admin.messaging().send(message);
    console.log(`✅ FCM notification sent to ${userName} (${userId}):`, response);
    return response;

  } catch (error) {
    console.error(`❌ Error sending FCM notification to user ${userId}:`, error.message);
    
    // Handle invalid or expired FCM tokens
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      console.log(`🗑️ Removing invalid FCM token for user: ${userId}`);
      await db.query('UPDATE users SET fcm_token = NULL WHERE id = $1', [userId]);
    }
    
    return null;
  }
}

/**
 * Send event reminder push notification to a user
 * @param {string} userId - User ID to send notification to
 * @param {object} eventReminder - Event reminder details
 * @returns {Promise<string|null>} - FCM response or null if failed
 */
async function sendEventReminderNotification(userId, eventReminder) {
  try {
    // Get user's FCM token from database
    const result = await db.query(
      'SELECT fcm_token, name FROM users WHERE id = $1',
      [userId]
    );
    
    const user = result.rows[0];
    if (!user?.fcm_token) {
      console.log(`⚠️ No FCM token for user: ${userId}`);
      return null;
    }

    const fcmToken = user.fcm_token;
    const userName = user.name || 'User';

    // Prepare notification message
    const message = {
      token: fcmToken,
      notification: {
        title: '📅 Event Reminder',
        body: eventReminder.message || `Upcoming event: ${eventReminder.event_title}`,
      },
      data: {
        type: 'event_reminder',
        notification_id: String(eventReminder.id || ''),
        event_id: String(eventReminder.event_id || ''),
        event_title: String(eventReminder.event_title || ''),
        event_date: String(eventReminder.event_date || ''),
        timestamp: new Date().toISOString(),
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'event_reminders',
          sound: 'default',
          color: '#4A90E2',
        },
      },
    };

    // Send FCM notification
    const response = await admin.messaging().send(message);
    console.log(`✅ FCM event reminder sent to ${userName} (${userId}):`, response);
    return response;

  } catch (error) {
    console.error(`❌ Error sending FCM event reminder to user ${userId}:`, error.message);
    
    // Handle invalid or expired FCM tokens
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      console.log(`🗑️ Removing invalid FCM token for user: ${userId}`);
      await db.query('UPDATE users SET fcm_token = NULL WHERE id = $1', [userId]);
    }
    
    return null;
  }
}

/**
 * Send generic push notification to a user
 * @param {string} userId - User ID to send notification to
 * @param {object} notification - Notification details
 * @returns {Promise<string|null>} - FCM response or null if failed
 */
async function sendGenericNotification(userId, notification) {
  try {
    // Get user's FCM token from database
    const result = await db.query(
      'SELECT fcm_token, name FROM users WHERE id = $1',
      [userId]
    );
    
    const user = result.rows[0];
    if (!user?.fcm_token) {
      console.log(`⚠️ No FCM token for user: ${userId}`);
      return null;
    }

    const fcmToken = user.fcm_token;
    const userName = user.name || 'User';

    // Prepare notification message
    const message = {
      token: fcmToken,
      notification: {
        title: notification.title || 'Notification',
        body: notification.message || notification.body || '',
      },
      data: {
        type: notification.type || 'general',
        notification_id: String(notification.id || ''),
        timestamp: new Date().toISOString(),
        ...notification.data, // Additional custom data
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'general_notifications',
          sound: 'default',
        },
      },
    };

    // Send FCM notification
    const response = await admin.messaging().send(message);
    console.log(`✅ FCM notification sent to ${userName} (${userId}):`, response);
    return response;

  } catch (error) {
    console.error(`❌ Error sending FCM notification to user ${userId}:`, error.message);
    
    // Handle invalid or expired FCM tokens
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      console.log(`🗑️ Removing invalid FCM token for user: ${userId}`);
      await db.query('UPDATE users SET fcm_token = NULL WHERE id = $1', [userId]);
    }
    
    return null;
  }
}

/**
 * Send push notifications to multiple users
 * @param {Array<string>} userIds - Array of user IDs
 * @param {object} notification - Notification details
 * @returns {Promise<Array>} - Array of FCM responses
 */
async function sendBulkNotifications(userIds, notification) {
  const promises = userIds.map(userId => {
    if (notification.type === 'stock_alert') {
      return sendStockAlertNotification(userId, notification);
    } else if (notification.type === 'event_reminder') {
      return sendEventReminderNotification(userId, notification);
    } else {
      return sendGenericNotification(userId, notification);
    }
  });

  return Promise.allSettled(promises);
}

module.exports = {
  sendStockAlertNotification,
  sendEventReminderNotification,
  sendGenericNotification,
  sendBulkNotifications,
};

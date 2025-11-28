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
    // Get device tokens for user from devices table
    const deviceResult = await db.query(
      'SELECT device_token FROM devices WHERE user_id = $1 AND device_token IS NOT NULL',
      [userId]
    );
    const deviceTokens = deviceResult.rows.map(r => r.device_token).filter(Boolean);
    if (deviceTokens.length === 0) {
      console.log(`⚠️ No device tokens for user: ${userId}`);
      return null;
    }

    // Use alert type passed from stock.js (already calculated based on item's threshold)
    const currentQty = stockAlert.current_quantity || 0;
    const threshold = stockAlert.threshold || 0;
    const alertType = (stockAlert.alert_type || 'low').toUpperCase();

    // Format time for Sweden timezone
    const swedenTime = new Date().toLocaleString('en-US', {
      timeZone: 'Europe/Stockholm',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    // Create detailed message matching the format used in notifications
    let body = `📉 STOCK ALERT - ${alertType} LEVEL\n\n`;
    body += `📦 Item: ${stockAlert.item_name}\n`;
    body += `📊 Current Stock: ${currentQty}\n`;
    body += `🎯 Threshold: ${threshold}\n`;
    body += `📱 Alert Type: ${alertType}`;
    body += `\n\nPlease restock immediately to avoid stockout!\n\n`;
    body += `Time: ${swedenTime}`;

    // Send notification to all device tokens
    const responses = [];
    for (const token of deviceTokens) {
      const message = {
        token,
        data: {
          title: '⚠️ Stock Alert',
          body: body,
          type: 'stock_alert',
          notification_id: String(stockAlert.id || ''),
          item_id: String(stockAlert.item_id || ''),
          item_name: String(stockAlert.item_name || ''),
          current_quantity: String(currentQty),
          threshold: String(threshold),
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: 'high',
        },
      };
      try {
        const response = await admin.messaging().send(message);
        responses.push(response);
        console.log(`✅ FCM notification sent to device ${token} for user ${userId}:`, response);
      } catch (error) {
        console.error(`❌ Error sending FCM notification to device ${token} for user ${userId}:`, error.message);
      }
    }
    return responses;

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
    // Get device tokens for user from devices table
    const deviceResult = await db.query(
      'SELECT device_token FROM devices WHERE user_id = $1 AND device_token IS NOT NULL',
      [userId]
    );
    const deviceTokens = deviceResult.rows.map(r => r.device_token).filter(Boolean);
    if (deviceTokens.length === 0) {
      console.log(`⚠️ No device tokens for user: ${userId}`);
      return null;
    }

    // Create detailed event reminder message
    const eventTitle = eventReminder.event_title || 'Event';
    const eventDate = eventReminder.event_date || 'Soon';
    const daysUntil = eventReminder.days_until || 0;
    
    // Format time for Sweden timezone
    const swedenTime = new Date().toLocaleString('en-US', {
      timeZone: 'Europe/Stockholm',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    let body = `📅 EVENT REMINDER\n\n`;
    body += `📌 Event: ${eventTitle}\n`;
    body += `📆 Date: ${eventDate}\n`;
    body += `⏰ ${daysUntil} day${daysUntil !== 1 ? 's' : ''} from now\n\n`;
    body += `Don't forget to prepare!\n\n`;
    body += `Time: ${swedenTime}`;

    // Send notification to all device tokens
    const responses = [];
    for (const token of deviceTokens) {
      const message = {
        token,
        data: {
          title: '📅 Event Reminder',
          body: body,
          type: 'event_reminder',
          notification_id: String(eventReminder.id || ''),
          event_id: String(eventReminder.event_id || ''),
          event_title: String(eventTitle),
          event_date: String(eventDate),
          days_until: String(daysUntil),
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: 'high',
        },
      };
      try {
        const response = await admin.messaging().send(message);
        responses.push(response);
        console.log(`✅ FCM event reminder sent to device ${token} for user ${userId}:`, response);
      } catch (error) {
        console.error(`❌ Error sending FCM event reminder to device ${token} for user ${userId}:`, error.message);
      }
    }
    return responses;

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
    // Get device tokens for user from devices table
    const deviceResult = await db.query(
      'SELECT device_token FROM devices WHERE user_id = $1 AND device_token IS NOT NULL',
      [userId]
    );
    const deviceTokens = deviceResult.rows.map(r => r.device_token).filter(Boolean);
    if (deviceTokens.length === 0) {
      console.log(`⚠️ No device tokens for user: ${userId}`);
      return null;
    }

    // Send notification to all device tokens
    const responses = [];
    for (const token of deviceTokens) {
      const message = {
        token,
        data: {
          title: notification.title || 'Notification',
          body: notification.message || notification.body || '',
          type: notification.type || 'general',
          notification_id: String(notification.id || ''),
          timestamp: new Date().toISOString(),
          ...notification.data,
        },
        android: {
          priority: 'high',
        },
      };
      try {
        const response = await admin.messaging().send(message);
        responses.push(response);
        console.log(`✅ FCM notification sent to device ${token} for user ${userId}:`, response);
      } catch (error) {
        console.error(`❌ Error sending FCM notification to device ${token} for user ${userId}:`, error.message);
      }
    }
    return responses;

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

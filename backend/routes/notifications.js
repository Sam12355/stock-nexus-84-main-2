const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../config/database');
const whatsappService = require('../services/whatsapp');
const emailService = require('../services/email');

const router = express.Router();

// Global notification update trigger function
const triggerNotificationUpdate = (req, branchId = null) => {
  console.log('📢 Backend: Triggering notification update for all connected clients');
  console.log('📢 Branch ID:', branchId);
  
  // Try to get Socket.IO from global or req.app
  const io = global.socketIO || req?.app?.get('io');
  console.log('📢 Socket.IO instance:', !!io);
  
  if (io) {
    if (branchId) {
      // Send to specific branch room
      console.log(`📢 Sending to branch room: branch-${branchId}`);
      io.to(`branch-${branchId}`).emit('notification-update', {
        type: 'notification-update',
        message: 'New notifications available',
        timestamp: new Date().toISOString()
      });
      console.log(`📢 Sent notification update to branch-${branchId}`);
    } else {
      // Send to all connected clients
      console.log('📢 Sending to all clients');
      io.emit('notification-update', {
        type: 'notification-update',
        message: 'New notifications available',
        timestamp: new Date().toISOString()
      });
      console.log('📢 Sent notification update to all clients');
    }
  } else {
    console.log('⚠️ Socket.IO not available, notification update not sent');
  }
};

// Get user notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    });
  }
});

// Mark notification as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification'
    });
  }
});

// Send stock alert notification
router.post('/stock-alert', authenticateToken, async (req, res) => {
  try {
    const { item_name, current_quantity, threshold, alert_type } = req.body;

    if (!item_name || current_quantity === undefined || !threshold || !alert_type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: item_name, current_quantity, threshold, alert_type'
      });
    }

    // Get user's phone number, email, notification settings, role, and branch information
    const userResult = await query(`
      SELECT u.phone, u.email, u.name, u.role, u.branch_context,
             b.name as branch_name, d.name as district_name, r.name as region_name
      FROM users u
      LEFT JOIN branches b ON u.branch_context = b.id
      LEFT JOIN districts d ON b.district_id = d.id
      LEFT JOIN regions r ON d.region_id = r.id
      WHERE u.id = $1
    `, [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userResult.rows[0];
    const phone = user.phone;
    const email = user.email;
    const userName = user.name;
    const isRegionalManager = user.role === 'regional_manager';
    
    // Check if stock level alerts are enabled in notification settings
    // Since notification_settings column doesn't exist, we'll enable notifications for testing
    // TODO: Remove this temporary fix once notification_settings column is added to database
    let stockAlertsEnabled = true; // Temporarily enable for testing
    let whatsappNotificationsEnabled = true; // Temporarily enable for testing
    let emailNotificationsEnabled = true; // Enable email notifications
    
    console.log(`🔍 User ${req.user.id} notification settings: using temporary defaults for testing`);
    console.log(`🔍 Stock alerts enabled: ${stockAlertsEnabled}`);
    console.log(`🔍 WhatsApp notifications enabled: ${whatsappNotificationsEnabled}`);
    console.log(`🔍 Email notifications enabled: ${emailNotificationsEnabled}`);
    
    if (!stockAlertsEnabled) {
      console.log(`Stock alerts disabled for user ${req.user.id}, skipping all notifications`);
      // Still create the notification record but don't send WhatsApp
      let notificationMessage = `${alert_type === 'critical' ? '🚨' : '⚠️'} STOCK ALERT - ${alert_type.toUpperCase()} LEVEL\n\n📦 Item: ${item_name}\n📊 Current Stock: ${current_quantity}\n🎯 Threshold: ${threshold}\n📱 Alert Type: ${alert_type.toUpperCase()}`;
      
      // Add district and branch information for regional managers
      if (isRegionalManager) {
        if (user.district_name) notificationMessage += `\n🏢 District: ${user.district_name}`;
        if (user.branch_name) notificationMessage += `\n🏪 Branch: ${user.branch_name}`;
      }
      
      notificationMessage += `\n\nPlease restock immediately to avoid stockout!\n\nTime: ${new Date().toLocaleString()}`;
      
      await query(
        'INSERT INTO notifications (user_id, title, message, type, data) VALUES ($1, $2, $3, $4, $5)',
        [
          req.user.id,
          `Stock Alert: ${item_name}`,
          notificationMessage,
          'stock_alert',
          JSON.stringify({
            item_name,
            current_quantity,
            threshold,
            alert_type
          })
        ]
      );
      
      return res.json({
        success: true,
        message: 'Stock alert notification created (WhatsApp disabled)'
      });
    }
    
    // Create alert message
    const emoji = alert_type === 'critical' ? '🚨' : alert_type === 'low' ? '⚠️' : '📉';
    const urgency = alert_type === 'critical' ? 'CRITICAL' : alert_type === 'low' ? 'LOW' : 'THRESHOLD';
    
    let message = `${emoji} STOCK ALERT - ${urgency} LEVEL

📦 Item: ${item_name}
📊 Current Stock: ${current_quantity}
🎯 Threshold: ${threshold}
📱 Alert Type: ${alert_type.toUpperCase()}`;

    // Add district and branch information for regional managers
    if (isRegionalManager) {
      if (user.district_name) message += `\n🏢 District: ${user.district_name}`;
      if (user.branch_name) message += `\n🏪 Branch: ${user.branch_name}`;
    }

    message += `

Please restock immediately to avoid stockout!

Time: ${new Date().toLocaleString()}`;

    // Create notification record
    await query(
      'INSERT INTO notifications (user_id, title, message, type, data) VALUES ($1, $2, $3, $4, $5)',
      [
        req.user.id,
        `Stock Alert: ${item_name}`,
        message,
        'stock_alert',
        JSON.stringify({
          item_name,
          current_quantity,
          threshold,
          alert_type
        })
      ]
    );

    // Trigger frontend notification update
    triggerNotificationUpdate(req, req.user.branch_id || req.user.branch_context);

    // Send WhatsApp notification using the enhanced message
    let whatsappResult = { success: false };
    if (phone && whatsappNotificationsEnabled) {
      whatsappResult = await whatsappService.sendMessage(phone, message);
      if (whatsappResult.success) {
        console.log(`✅ WhatsApp alert sent successfully to ${phone}`);
      } else {
        console.error(`❌ Failed to send WhatsApp alert to ${phone}:`, whatsappResult.error);
      }
    } else if (!whatsappNotificationsEnabled) {
      console.log(`⚠️ WhatsApp notifications disabled for user ${req.user.id}, skipping WhatsApp notification`);
    } else {
      console.log(`⚠️ No phone number found for user ${req.user.id}, skipping WhatsApp notification`);
    }

    // Send email notification
    let emailResult = { success: false };
    if (email && emailNotificationsEnabled) {
      emailResult = await emailService.sendStockAlert(
        email,
        userName,
        item_name,
        current_quantity,
        threshold,
        alert_type,
        user.district_name,
        user.branch_name
      );
      if (emailResult.success) {
        console.log(`✅ Email alert sent successfully to ${email}`);
      } else {
        console.error(`❌ Failed to send email alert to ${email}:`, emailResult.error);
      }
    } else if (!email) {
      console.log(`⚠️ No email address found for user ${req.user.id}, skipping email notification`);
    } else if (!emailNotificationsEnabled) {
      console.log(`⚠️ Email notifications disabled for user ${req.user.id}, skipping email notification`);
    }

    res.json({
      success: true,
      message: 'Stock alert notification sent'
    });
  } catch (error) {
    console.error('Error sending stock alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send stock alert'
    });
  }
});

// Test user notification settings
router.get('/test-user-settings', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Test user settings request for user:', req.user.email);
    
    const userResult = await query(`
      SELECT u.id, u.name, u.email, u.phone, u.role, u.branch_context,
             b.name as branch_name, d.name as district_name, r.name as region_name
      FROM users u
      LEFT JOIN branches b ON u.branch_context = b.id
      LEFT JOIN districts d ON b.district_id = d.id
      LEFT JOIN regions r ON d.region_id = r.id
      WHERE u.id = $1
    `, [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userResult.rows[0];
    
    // Since notification_settings column doesn't exist, return default settings
    const settings = {
      email: false,
      whatsapp: false,
      sms: false,
      stockLevelAlerts: false,
      eventReminders: false
    };

    console.log('✅ User settings retrieved (using defaults):', settings);
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        branch_context: user.branch_context,
        branch_name: user.branch_name,
        notification_settings: settings,
        stockLevelAlerts: settings.stockLevelAlerts,
        whatsapp: settings.whatsapp,
        email_notifications: settings.email
      }
    });
  } catch (error) {
    console.error('❌ Error getting user settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user settings: ' + error.message
    });
  }
});

// Test stock alert for current user
router.post('/test-stock-alert', authenticateToken, async (req, res) => {
  try {
    const { item_name, current_quantity, threshold, alert_type } = req.body;

    // Use default values if not provided
    const testItem = item_name || 'Test Item';
    const testQuantity = current_quantity || 5;
    const testThreshold = threshold || 10;
    const testAlertType = alert_type || 'low';

    // Call the existing stock alert endpoint
    const alertResult = await fetch('http://localhost:5000/api/notifications/stock-alert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      },
      body: JSON.stringify({
        item_name: testItem,
        current_quantity: testQuantity,
        threshold: testThreshold,
        alert_type: testAlertType
      })
    });

    const result = await alertResult.json();

    res.json({
      success: true,
      message: 'Test stock alert triggered',
      result: result
    });
  } catch (error) {
    console.error('Error testing stock alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test stock alert'
    });
  }
});

// Send test notification
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { type, message } = req.body;

    if (!type || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, message'
      });
    }

    // Get user's phone number and email
    const userResult = await query(
      'SELECT phone, email, name FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userResult.rows[0];
    const phone = user.phone;
    const email = user.email;
    const userName = user.name;

    let results = [];

    // Send WhatsApp test notification
    if (phone) {
      const whatsappResult = await whatsappService.sendTestMessage(phone, message);
      results.push({
        type: 'whatsapp',
        success: whatsappResult.success,
        error: whatsappResult.error
      });
      
      if (whatsappResult.success) {
        console.log(`✅ WhatsApp test message sent successfully to ${phone}`);
      } else {
        console.error(`❌ Failed to send WhatsApp test message to ${phone}:`, whatsappResult.error);
      }
    }

    // Send email test notification
    if (email) {
      const emailResult = await emailService.sendTestEmail(email, userName);
      results.push({
        type: 'email',
        success: emailResult.success,
        error: emailResult.error
      });
      
      if (emailResult.success) {
        console.log(`✅ Email test message sent successfully to ${email}`);
      } else {
        console.error(`❌ Failed to send email test message to ${email}:`, emailResult.error);
      }
    }

    res.json({
      success: true,
      message: 'Test notifications sent',
      results: results
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
});

// Clean up resolved stock alerts (when item becomes adequate)
router.post('/cleanup-resolved-alerts', authenticateToken, async (req, res) => {
  try {
    const { item_name } = req.body;

    if (!item_name) {
      return res.status(400).json({
        success: false,
        error: 'Item name is required'
      });
    }

    // Delete all unread stock alert notifications for this item
    const result = await query(
      'DELETE FROM notifications WHERE user_id = $1 AND type = $2 AND is_read = false AND data->>\'item_name\' = $3',
      [req.user.id, 'stock_alert', item_name]
    );

    res.json({
      success: true,
      message: `Cleaned up ${result.rowCount} resolved stock alerts for ${item_name}`,
      cleaned: result.rowCount
    });

  } catch (error) {
    console.error('Error cleaning up resolved stock alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clean up resolved stock alerts'
    });
  }
});

// Test WhatsApp endpoint for debugging
router.post('/test-whatsapp', authenticateToken, async (req, res) => {
  try {
    const { phone_number, message } = req.body;
    
    if (!phone_number) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    const testMessage = message || '🧪 TEST MESSAGE\n\nThis is a test from your Stock Nexus system.\n\nIf you receive this, WhatsApp is working correctly!';
    
    console.log(`🧪 Testing WhatsApp to: ${phone_number}`);
    const result = await whatsappService.sendMessage(phone_number, testMessage);
    
    res.json({
      success: result.success,
      message: result.success ? 'Test message sent successfully' : 'Failed to send test message',
      details: result
    });
  } catch (error) {
    console.error('Error testing WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test WhatsApp'
    });
  }
});

module.exports = router;

// Export the trigger function for use by other routes
module.exports.triggerNotificationUpdate = triggerNotificationUpdate;


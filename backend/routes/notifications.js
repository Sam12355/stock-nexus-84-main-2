const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../config/database');
const whatsappService = require('../services/whatsapp');

const router = express.Router();

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

    // Get user's phone number for WhatsApp notification
    const userResult = await query(
      'SELECT phone FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].phone) {
      return res.status(400).json({
        success: false,
        error: 'User phone number not found'
      });
    }

    const phone = userResult.rows[0].phone;
    
    // Create alert message
    const emoji = alert_type === 'critical' ? '🚨' : '⚠️';
    const urgency = alert_type === 'critical' ? 'CRITICAL' : 'LOW';
    
    const message = `${emoji} STOCK ALERT - ${urgency} LEVEL

📦 Item: ${item_name}
📊 Current Stock: ${current_quantity}
🎯 Threshold: ${threshold}
📱 Alert Type: ${alert_type.toUpperCase()}

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

    // Send WhatsApp notification
    const whatsappResult = await whatsappService.sendStockAlert(
      phone,
      item_name,
      current_quantity,
      threshold,
      alert_type
    );

    if (whatsappResult.success) {
      console.log(`✅ WhatsApp alert sent successfully to ${phone}`);
    } else {
      console.error(`❌ Failed to send WhatsApp alert to ${phone}:`, whatsappResult.error);
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

    // Get user's phone number
    const userResult = await query(
      'SELECT phone FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].phone) {
      return res.status(400).json({
        success: false,
        error: 'User phone number not found'
      });
    }

    const phone = userResult.rows[0].phone;

    // Send WhatsApp test notification
    const whatsappResult = await whatsappService.sendTestMessage(phone, message);

    if (whatsappResult.success) {
      console.log(`✅ WhatsApp test message sent successfully to ${phone}`);
    } else {
      console.error(`❌ Failed to send WhatsApp test message to ${phone}:`, whatsappResult.error);
    }

    res.json({
      success: true,
      message: 'Test notification sent'
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
});

module.exports = router;


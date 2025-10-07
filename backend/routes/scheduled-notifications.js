const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const { query } = require('../config/database');
const whatsappService = require('../services/whatsapp');
const schedulerService = require('../services/scheduler');

const router = express.Router();

// Get scheduler status
router.get('/status', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const status = schedulerService.getStatus();
    res.json({
      success: true,
      scheduler: status
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scheduler status'
    });
  }
});

// Manually trigger scheduled alerts (for testing)
router.post('/trigger-alerts', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    await schedulerService.checkAndSendScheduledAlerts();
    res.json({
      success: true,
      message: 'Scheduled alerts check completed'
    });
  } catch (error) {
    console.error('Error triggering scheduled alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger scheduled alerts'
    });
  }
});

// Send scheduled stock alerts (legacy endpoint - now handled automatically)
router.post('/send-scheduled-alerts', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentDate = now.getDate(); // 1-31
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    console.log(`🕐 Checking scheduled alerts at ${currentTime} (Day: ${currentDay}, Date: ${currentDate})`);

    // Get users with scheduled stock alerts
    const usersResult = await query(`
      SELECT u.id, u.name, u.phone, u.stock_alert_frequency, u.stock_alert_schedule_day, 
             u.stock_alert_schedule_date, u.stock_alert_schedule_time, u.branch_context,
             b.name as branch_name
      FROM users u
      LEFT JOIN branches b ON u.branch_context = b.id
      WHERE u.stock_alert_frequency IS NOT NULL 
      AND u.stock_alert_frequency != 'immediate'
      AND u.phone IS NOT NULL
      AND u.is_active = true
    `);

    const eligibleUsers = [];

    for (const user of usersResult.rows) {
      const { stock_alert_frequency, stock_alert_schedule_day, stock_alert_schedule_date, stock_alert_schedule_time } = user;
      
      let shouldSend = false;

      switch (stock_alert_frequency) {
        case 'daily':
          shouldSend = currentTime === stock_alert_schedule_time;
          break;
        case 'weekly':
          shouldSend = currentDay === stock_alert_schedule_day && currentTime === stock_alert_schedule_time;
          break;
        case 'monthly':
          shouldSend = currentDate === stock_alert_schedule_date && currentTime === stock_alert_schedule_time;
          break;
      }

      if (shouldSend) {
        eligibleUsers.push(user);
      }
    }

    console.log(`📊 Found ${eligibleUsers.length} users eligible for scheduled alerts`);

    if (eligibleUsers.length === 0) {
      return res.json({
        success: true,
        message: 'No users eligible for scheduled alerts at this time',
        sent: 0
      });
    }

    // Get low stock items for each user's branch
    const alertsSent = [];

    for (const user of eligibleUsers) {
      try {
        let stockQuery = `
          SELECT s.*, i.name, i.category, i.threshold_level, i.low_level, i.critical_level
          FROM stock s
          JOIN items i ON s.item_id = i.id
          WHERE s.current_quantity <= i.threshold_level
        `;

        let params = [];

        // Filter by user's branch if they have one
        if (user.branch_context) {
          stockQuery += ' AND i.branch_id = $1';
          params.push(user.branch_context);
        }

        const stockResult = await query(stockQuery, params);
        const lowStockItems = stockResult.rows;

        if (lowStockItems.length === 0) {
          console.log(`📦 No low stock items for user ${user.name}`);
          continue;
        }

        // Create scheduled alert message
        const frequencyText = user.stock_alert_frequency === 'daily' ? 'Daily' :
                            user.stock_alert_frequency === 'weekly' ? 'Weekly' : 'Monthly';
        
        let message = `📊 ${frequencyText} Stock Alert Summary\n\n`;
        message += `Branch: ${user.branch_name || 'All Branches'}\n`;
        message += `Date: ${now.toLocaleDateString()}\n\n`;
        message += `Low Stock Items (${lowStockItems.length}):\n\n`;

        lowStockItems.forEach((item, index) => {
          const status = item.current_quantity <= (item.critical_level || Math.floor(item.threshold_level * 0.2)) ? '🚨 CRITICAL' :
                        item.current_quantity <= (item.low_level || Math.floor(item.threshold_level * 0.5)) ? '⚠️ LOW' : '📉 BELOW THRESHOLD';
          
          message += `${index + 1}. ${item.name}\n`;
          message += `   Current: ${item.current_quantity} | Threshold: ${item.threshold_level}\n`;
          message += `   Status: ${status}\n\n`;
        });

        message += `Please restock these items to maintain adequate inventory levels.\n\n`;
        message += `Time: ${now.toLocaleString()}`;

        // Send WhatsApp message
        const whatsappResult = await whatsappService.sendMessage(user.phone, message);

        if (whatsappResult.success) {
          alertsSent.push({
            user: user.name,
            phone: user.phone,
            items: lowStockItems.length,
            messageSid: whatsappResult.sid
          });
          console.log(`✅ Scheduled alert sent to ${user.name} (${lowStockItems.length} items)`);
        } else {
          console.error(`❌ Failed to send scheduled alert to ${user.name}:`, whatsappResult.error);
        }

      } catch (error) {
        console.error(`❌ Error processing scheduled alert for user ${user.name}:`, error);
      }
    }

    res.json({
      success: true,
      message: `Scheduled alerts processed`,
      sent: alertsSent.length,
      details: alertsSent
    });

  } catch (error) {
    console.error('Error sending scheduled alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send scheduled alerts'
    });
  }
});

// Get scheduled alert status for a user
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(`
      SELECT stock_alert_frequency, stock_alert_schedule_day, stock_alert_schedule_date, stock_alert_schedule_time
      FROM users
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const schedule = result.rows[0];

    res.json({
      success: true,
      schedule: {
        frequency: schedule.stock_alert_frequency || 'immediate',
        scheduleDay: schedule.stock_alert_schedule_day,
        scheduleDate: schedule.stock_alert_schedule_date,
        scheduleTime: schedule.stock_alert_schedule_time || '09:00'
      }
    });

  } catch (error) {
    console.error('Error getting scheduled alert status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scheduled alert status'
    });
  }
});

module.exports = router;

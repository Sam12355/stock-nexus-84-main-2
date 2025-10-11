const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const EmailService = require('../services/email-graph');
const WhatsAppService = require('../services/whatsapp');

const router = express.Router();

// Check for softdrink trends and send alerts
router.post('/check-trends', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Checking softdrink trends for alerts...');
    
    // Get users who have softdrink trends alerts enabled
    const usersResult = await query(`
      SELECT u.id, u.name, u.email, u.phone, u.role, u.branch_context,
             b.name as branch_name, d.name as district_name, r.name as region_name,
             u.notification_settings
      FROM users u
      LEFT JOIN branches b ON u.branch_context = b.id
      LEFT JOIN districts d ON b.district_id = d.id
      LEFT JOIN regions r ON d.region_id = r.id
      WHERE u.is_active = true
    `);

    const usersWithTrendsAlerts = [];
    
    for (const user of usersResult.rows) {
      let notificationSettings = {};
      try {
        notificationSettings = user.notification_settings ? JSON.parse(user.notification_settings) : {};
      } catch (e) {
        console.log('⚠️ Error parsing notification settings for user:', user.email);
        continue;
      }
      
      // Check if softdrink trends alerts are enabled
      if (notificationSettings.softdrinkTrends === true) {
        usersWithTrendsAlerts.push({
          ...user,
          notificationSettings
        });
      }
    }

    console.log(`📊 Found ${usersWithTrendsAlerts.length} users with softdrink trends alerts enabled`);

    if (usersWithTrendsAlerts.length === 0) {
      return res.json({
        success: true,
        message: 'No users have softdrink trends alerts enabled',
        alertsSent: 0
      });
    }

    // Get softdrink trends data for the last week
    const trendsResult = await query(`
      WITH weekly_data AS (
        SELECT 
          i.name as item_name,
          DATE_TRUNC('week', sm.created_at) as week_start,
          SUM(CASE WHEN sm.movement_type = 'in' THEN sm.quantity ELSE 0 END) as stock_in,
          SUM(CASE WHEN sm.movement_type = 'out' THEN sm.quantity ELSE 0 END) as stock_out,
          SUM(CASE WHEN sm.movement_type = 'in' THEN sm.quantity ELSE -sm.quantity END) as net_change
        FROM stock_movements sm
        JOIN items i ON sm.item_id = i.id
        WHERE i.category = 'softdrinks'
          AND sm.created_at >= DATE_TRUNC('week', NOW()) - INTERVAL '1 week'
          AND sm.created_at < DATE_TRUNC('week', NOW()) + INTERVAL '1 week'
        GROUP BY i.name, DATE_TRUNC('week', sm.created_at)
      )
      SELECT 
        item_name,
        stock_in,
        stock_out,
        net_change,
        CASE 
          WHEN net_change < 0 THEN 'declining'
          WHEN net_change = 0 THEN 'stable'
          ELSE 'growing'
        END as trend
      FROM weekly_data
      WHERE net_change < 0
      ORDER BY net_change ASC
    `);

    const decliningItems = trendsResult.rows;
    console.log(`📉 Found ${decliningItems.length} softdrink items with declining trends`);

    if (decliningItems.length === 0) {
      return res.json({
        success: true,
        message: 'No declining softdrink trends found',
        alertsSent: 0
      });
    }

    // Send alerts to users
    let alertsSent = 0;
    const emailService = new EmailService();
    const whatsappService = new WhatsAppService();

    for (const user of usersWithTrendsAlerts) {
      try {
        // Send email alert if enabled
        if (user.notificationSettings.email === true) {
          await emailService.sendSoftdrinkTrendAlert(
            user.email,
            user.name,
            decliningItems,
            user.branch_name,
            user.district_name
          );
          console.log(`📧 Softdrink trend alert sent via email to ${user.email}`);
        }

        // Send WhatsApp alert if enabled and phone number exists
        if (user.notificationSettings.whatsapp === true && user.phone) {
          const message = `🚨 Softdrink Trend Alert\n\nHello ${user.name},\n\nWe've detected declining trends in the following softdrink items:\n\n${decliningItems.map(item => `• ${item.item_name}: Net change ${item.net_change} (${item.trend})`).join('\n')}\n\nPlease review your inventory and consider adjusting your ordering strategy.\n\nBest regards,\nInventory Management System`;
          
          await whatsappService.sendMessage(user.phone, message);
          console.log(`📱 Softdrink trend alert sent via WhatsApp to ${user.phone}`);
        }

        alertsSent++;
      } catch (error) {
        console.error(`❌ Error sending softdrink trend alert to ${user.email}:`, error);
      }
    }

    res.json({
      success: true,
      message: `Softdrink trend alerts sent successfully`,
      alertsSent,
      decliningItems: decliningItems.length,
      usersNotified: usersWithTrendsAlerts.length
    });

  } catch (error) {
    console.error('❌ Error checking softdrink trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check softdrink trends: ' + error.message
    });
  }
});

// Test softdrink trend alert for current user
router.post('/test-alert', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Test softdrink trend alert request for user:', req.user.email);
    
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
    
    // Create test declining items data
    const testDecliningItems = [
      {
        item_name: 'Coca Cola',
        stock_in: 100,
        stock_out: 150,
        net_change: -50,
        trend: 'declining'
      },
      {
        item_name: 'Pepsi',
        stock_in: 80,
        stock_out: 120,
        net_change: -40,
        trend: 'declining'
      }
    ];

    const emailService = new EmailService();
    const whatsappService = new WhatsAppService();

    // Send test email alert
    if (user.email) {
      await emailService.sendSoftdrinkTrendAlert(
        user.email,
        user.name,
        testDecliningItems,
        user.branch_name,
        user.district_name
      );
      console.log(`📧 Test softdrink trend alert sent via email to ${user.email}`);
    }

    // Send test WhatsApp alert
    if (user.phone) {
      const message = `🚨 Test Softdrink Trend Alert\n\nHello ${user.name},\n\nThis is a test alert for declining softdrink trends:\n\n${testDecliningItems.map(item => `• ${item.item_name}: Net change ${item.net_change} (${item.trend})`).join('\n')}\n\nThis is a test message.\n\nBest regards,\nInventory Management System`;
      
      await whatsappService.sendMessage(user.phone, message);
      console.log(`📱 Test softdrink trend alert sent via WhatsApp to ${user.phone}`);
    }

    res.json({
      success: true,
      message: 'Test softdrink trend alert sent successfully',
      testData: testDecliningItems
    });

  } catch (error) {
    console.error('❌ Error sending test softdrink trend alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test softdrink trend alert: ' + error.message
    });
  }
});

module.exports = router;

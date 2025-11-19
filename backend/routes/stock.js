const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../config/database');
const whatsappService = require('../services/whatsapp');
const emailService = require('../services/email');
const { triggerNotificationUpdate } = require('./notifications');

const router = express.Router();

// Get stock data with item details
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Fetching stock data for user:', req.user.email, 'role:', req.user.role);
    
    let queryText = `
      SELECT s.*, 
             i.name, i.category, i.threshold_level, i.image_url, i.branch_id,
             i.base_unit, i.packaging_unit, i.units_per_package, i.enable_packaging
      FROM stock s
      JOIN items i ON s.item_id = i.id
    `;
    let params = [];

    // Filter by branch only for managers (not for staff or admin)
    if (req.user.role === 'manager') {
      queryText += ' WHERE i.branch_id = $1';
      params.push(req.user.branch_id);
      console.log('🔍 Filtering by branch_id:', req.user.branch_id);
    }

    queryText += ' ORDER BY s.last_updated DESC';

    console.log('🔍 Executing stock query:', queryText);
    const result = await query(queryText, params);
    console.log('✅ Found', result.rows.length, 'stock records');

    // Transform the data to match frontend expectations
    const stockData = result.rows.map(row => ({
      id: row.id,
      item_id: row.item_id,
      current_quantity: row.current_quantity,
      last_updated: row.last_updated,
      items: {
        name: row.name,
        category: row.category,
        threshold_level: row.threshold_level,
        image_url: row.image_url,
        branch_id: row.branch_id,
        base_unit: row.base_unit,
        packaging_unit: row.packaging_unit,
        units_per_package: row.units_per_package,
        enable_packaging: row.enable_packaging
      }
    }));

    res.json({
      success: true,
      data: stockData
    });
  } catch (error) {
    console.error('Error fetching stock data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stock data'
    });
  }
});

// Update stock quantity
router.post('/movement', authenticateToken, async (req, res) => {
  try {
    const { item_id, movement_type, quantity, reason, unit_type, original_quantity, unit_label } = req.body;

    if (!item_id || !movement_type || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: item_id, movement_type, quantity'
      });
    }

    // Validate movement type
    if (!['in', 'out'].includes(movement_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid movement_type. Must be "in" or "out"'
      });
    }

    // Get current stock quantity
    const currentStockResult = await query(
      'SELECT current_quantity FROM stock WHERE item_id = $1',
      [item_id]
    );

    if (currentStockResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Stock record not found for this item'
      });
    }

    const currentQuantity = currentStockResult.rows[0].current_quantity;
    let newQuantity;

    if (movement_type === 'in') {
      newQuantity = currentQuantity + parseInt(quantity);
    } else {
      // For stock out, check if there's enough stock
      if (parseInt(quantity) > currentQuantity) {
        // Get item details for better error message
        const itemResult = await query(
          'SELECT i.name, i.base_unit, i.packaging_unit, i.units_per_package FROM items i WHERE i.id = $1',
          [item_id]
        );
        
        const item = itemResult.rows[0];
        const baseUnit = item.base_unit || 'piece';
        let errorMessage = `Insufficient stock! Cannot remove ${quantity} ${baseUnit}${quantity !== 1 ? 's' : ''}. Only ${currentQuantity} ${baseUnit}${currentQuantity !== 1 ? 's' : ''} available.`;
        
        // If trying to remove by packaging, suggest alternatives
        if (unit_type === 'packaging' && item.units_per_package && original_quantity) {
          const maxPackages = Math.floor(currentQuantity / item.units_per_package);
          const remainingPieces = currentQuantity % item.units_per_package;
          
          if (maxPackages > 0) {
            errorMessage += ` You can remove up to ${maxPackages} ${item.packaging_unit}${maxPackages !== 1 ? 's' : ''}`;
            if (remainingPieces > 0) {
              errorMessage += ` and ${remainingPieces} ${baseUnit}${remainingPieces !== 1 ? 's' : ''} separately.`;
            } else {
              errorMessage += `.`;
            }
          } else {
            errorMessage += ` Please remove by ${baseUnit} instead.`;
          }
        }
        
        return res.status(400).json({
          success: false,
          error: errorMessage
        });
      }
      newQuantity = currentQuantity - parseInt(quantity);
    }

    // Update stock quantity
    await query(
      'UPDATE stock SET current_quantity = $1, last_updated = NOW(), updated_by = $2 WHERE item_id = $3',
      [newQuantity, req.user.id, item_id]
    );

    // Log the movement with UoM details
    await query(
      'INSERT INTO stock_movements (item_id, movement_type, quantity, reason, unit_type, original_quantity, unit_label, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())',
      [item_id, movement_type, parseInt(quantity), reason || null, unit_type || 'base', original_quantity || parseInt(quantity), unit_label || 'piece', req.user.id]
    );

    // Log the activity
    await query(
      'INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
      [
        req.user.id,
        'stock_movement',
        JSON.stringify({
          item_id,
          movement_type,
          quantity: parseInt(quantity),
          previous_quantity: currentQuantity,
          new_quantity: newQuantity,
          reason: reason || null
        }),
        req.ip,
        req.get('User-Agent')
      ]
    );

    // Check if stock levels trigger alerts (only for stock out movements)
    if (movement_type === 'out') {
      try {
        // Get item details for alert
        const itemResult = await query(`
          SELECT i.name as item_name, i.threshold_level
          FROM items i
          WHERE i.id = $1
        `, [item_id]);

        if (itemResult.rows.length > 0) {
          const item = itemResult.rows[0];
          const threshold = item.threshold_level;
          const lowLevel = Math.floor(threshold * 0.5); // Calculate low level as 50% of threshold
          const criticalLevel = Math.floor(threshold * 0.2); // Calculate critical level as 20% of threshold

          let alertType = null;
          if (newQuantity <= criticalLevel) {
            alertType = 'critical';
          } else if (newQuantity <= lowLevel) {
            alertType = 'low';
          } else if (newQuantity <= threshold) {
            alertType = 'threshold';
          }

          // Send stock alert to all subscribed users if needed (in background)
          if (alertType) {
            // Send alerts in background without blocking the response
            setImmediate(async () => {
              try {
                // Check if an alert was already sent recently for this item and stock level (within last 5 minutes)
                // Check for both stock_out and moveout_list alerts to prevent duplicates
                const recentAlertCheck = await query(`
                  SELECT id FROM notifications 
                  WHERE type = 'stock_alert' 
                  AND data::text LIKE $1
                  AND (data::text LIKE $2 OR data::text LIKE $3)
                  AND created_at > NOW() - INTERVAL '5 minutes'
                  LIMIT 1
                `, [`%"item_name":"${item.item_name}"%`, `%"source":"stock_out"%`, `%"source":"moveout_list"%`]);

                if (recentAlertCheck.rows.length > 0) {
                  console.log(`⚠️ Alert already sent recently for "${item.item_name}" at ${newQuantity} units, skipping duplicate alert`);
                  return;
                }
                // Get all users who have stock alerts enabled
                const usersResult = await query(`
                  SELECT u.id, u.phone, u.email, u.name, u.role, u.branch_context,
                         u.notification_settings,
                         b.name as branch_name, d.name as district_name, r.name as region_name
                  FROM users u
                  LEFT JOIN branches b ON u.branch_context = b.id
                  LEFT JOIN districts d ON b.district_id = d.id
                  LEFT JOIN regions r ON d.region_id = r.id
                  WHERE u.is_active = true
                  AND (u.phone IS NOT NULL OR u.email IS NOT NULL)
                `);

                console.log(`📊 Total active users with phone/email: ${usersResult.rows.length}`);

                // Filter users who have stock alerts enabled in their notification settings
                const subscribedUsers = usersResult.rows.filter(user => {
                  try {
                    let settings = {};
                    if (typeof user.notification_settings === 'string') {
                      settings = user.notification_settings ? JSON.parse(user.notification_settings) : {};
                    } else if (typeof user.notification_settings === 'object' && user.notification_settings !== null) {
                      settings = user.notification_settings;
                    }
                    const hasStockAlerts = settings.stockLevelAlerts === true;
                    console.log(`👤 User ${user.name} (${user.id}): stockLevelAlerts=${hasStockAlerts}, settings:`, settings);
                    return hasStockAlerts;
                  } catch (error) {
                    console.error(`Error parsing notification settings for user ${user.name}:`, error);
                    return false;
                  }
                });

                if (subscribedUsers.length === 0) {
                  console.log('⚠️ No users have stock level alerts enabled, skipping notifications');
                  return;
                }

                console.log(`📢 Found ${subscribedUsers.length} users with stock alerts enabled:`, subscribedUsers.map(u => `${u.name} (${u.id})`));

                console.log(`📢 Found ${subscribedUsers.length} users with stock alerts enabled`);

                // Remove duplicate phone numbers - keep only the first user with each phone number
                const uniqueUsers = [];
                const seenPhones = new Set();
                
                for (const user of subscribedUsers) {
                  if (user.phone && !seenPhones.has(user.phone)) {
                    seenPhones.add(user.phone);
                    uniqueUsers.push(user);
                  } else if (!user.phone) {
                    // Users without phone numbers are still included
                    uniqueUsers.push(user);
                  }
                }

                console.log(`📢 Sending ${alertType} stock alert for "${item.item_name}" to ${uniqueUsers.length} unique users`);

                // Send alerts to all unique subscribed users
                for (const user of uniqueUsers) {
                  try {
                    const phone = user.phone;
                    const email = user.email;
                    const userName = user.name;
                    const isRegionalManager = user.role === 'regional_manager';
                    
                    // Check notification preferences
                    let whatsappNotificationsEnabled = false;
                    let emailNotificationsEnabled = false;
                    
                    try {
                      let settings = {};
                      if (typeof user.notification_settings === 'string') {
                        settings = user.notification_settings ? JSON.parse(user.notification_settings) : {};
                      } else if (typeof user.notification_settings === 'object' && user.notification_settings !== null) {
                        settings = user.notification_settings;
                      }
                      whatsappNotificationsEnabled = settings.whatsapp === true;
                      emailNotificationsEnabled = settings.email === true;
                    } catch (error) {
                      console.error(`Error parsing notification settings for user ${user.name}:`, error);
                    }

                    // Create alert message
                    let message = `📉 STOCK ALERT - ${alertType.toUpperCase()} LEVEL\n\n`;
                    message += `📦 Item: ${item.item_name}\n`;
                    message += `📊 Current Stock: ${newQuantity}\n`;
                    message += `🎯 Threshold: ${threshold}\n`;
                    message += `📱 Alert Type: ${alertType.toUpperCase()}`;

                    // Add district and branch information for regional managers
                    if (isRegionalManager) {
                      if (user.district_name) message += `\n🏢 District: ${user.district_name}`;
                      if (user.branch_name) message += `\n🏪 Branch: ${user.branch_name}`;
                    }

                    message += `\n\nPlease restock immediately to avoid stockout!\n\nTime: ${new Date().toLocaleString()}`;

                    // Create notification record
                    await query(
                      'INSERT INTO notifications (user_id, title, message, type, data) VALUES ($1, $2, $3, $4, $5)',
                      [
                        user.id,
                        `Stock Alert: ${item.item_name}`,
                        message,
                        'stock_alert',
                        JSON.stringify({
                          item_name: item.item_name,
                          current_quantity: newQuantity,
                          threshold: threshold,
                          alert_type: alertType,
                          source: 'stock_out'
                        })
                      ]
                    );
                    
                    console.log(`✅ Created notification record for user ${user.name} (${user.id})`);

                    // Send WhatsApp notification
                    if (phone && whatsappNotificationsEnabled) {
                      const whatsappResult = await whatsappService.sendMessage(phone, message);
                      if (whatsappResult.success) {
                        console.log(`✅ WhatsApp alert sent successfully to ${user.name} (${phone})`);
                      } else {
                        console.error(`❌ Failed to send WhatsApp alert to ${user.name}:`, whatsappResult.error);
                      }
                    } else if (!whatsappNotificationsEnabled) {
                      console.log(`⚠️ WhatsApp notifications disabled for user ${user.name}, skipping WhatsApp notification`);
                    } else {
                      console.log(`⚠️ No phone number found for user ${user.name}, skipping WhatsApp notification`);
                    }

                    // Send email notification
                    if (email && emailNotificationsEnabled) {
                      const emailResult = await emailService.sendStockAlert(
                        email,
                        userName,
                        item.item_name,
                        newQuantity,
                        threshold,
                        alertType,
                        user.district_name,
                        user.branch_name
                      );
                      if (emailResult.success) {
                        console.log(`✅ Email alert sent successfully to ${user.name} (${email})`);
                      } else {
                        console.error(`❌ Failed to send email alert to ${user.name}:`, emailResult.error);
                      }
                    } else if (!emailNotificationsEnabled) {
                      console.log(`⚠️ Email notifications disabled for user ${user.name}, skipping email notification`);
                    } else {
                      console.log(`⚠️ No email address found for user ${user.name}, skipping email notification`);
                    }

                  } catch (userAlertError) {
                    console.error(`❌ Error sending alert to user ${user.name}:`, userAlertError);
                  }
                }

                console.log(`✅ Stock alert processing completed for "${item.item_name}"`);
                
                // Trigger frontend notification update
                triggerNotificationUpdate(req, req.user.branch_id || req.user.branch_context);
              } catch (alertError) {
                console.error('❌ Error processing stock alerts:', alertError);
              }
            });
          }
        }
      } catch (error) {
        console.error('❌ Error checking stock levels for alerts:', error);
      }
    }

    res.json({
      success: true,
      data: {
        item_id,
        previous_quantity: currentQuantity,
        new_quantity: newQuantity,
        movement_type,
        quantity: parseInt(quantity)
      }
    });
  } catch (error) {
    console.error('Error updating stock quantity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update stock quantity'
    });
  }
});

// Initialize stock for items that don't have stock records
router.post('/initialize', authenticateToken, async (req, res) => {
  try {
    // Find items that don't have stock records
    const itemsWithoutStock = await query(`
      SELECT i.id, i.name, i.branch_id
      FROM items i
      LEFT JOIN stock s ON i.id = s.item_id
      WHERE s.item_id IS NULL
    `);

    if (itemsWithoutStock.rows.length === 0) {
      return res.json({
        success: true,
        message: 'All items already have stock records',
        initialized: 0
      });
    }

    // Create stock records for items without them
    let initialized = 0;
    for (const item of itemsWithoutStock.rows) {
      await query(
        'INSERT INTO stock (item_id, current_quantity, updated_by) VALUES ($1, $2, $3)',
        [item.id, 0, req.user.id]
      );
      initialized++;
    }

    // Log the activity
    await query(
      'INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
      [
        req.user.id,
        'stock_initialized',
        JSON.stringify({
          initialized_count: initialized,
          items: itemsWithoutStock.rows.map(item => ({ id: item.id, name: item.name }))
        }),
        req.ip,
        req.get('User-Agent')
      ]
    );

    res.json({
      success: true,
      message: `Initialized stock records for ${initialized} items`,
      initialized
    });
  } catch (error) {
    console.error('Error initializing stock records:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize stock records'
    });
  }
});

module.exports = router;


const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');
const whatsappService = require('../services/whatsapp');
const emailService = require('../services/email');
const { triggerNotificationUpdate } = require('./notifications');

const router = express.Router();

// Get all moveout lists for users in the same branch
router.get('/', authenticateToken, async (req, res) => {
  try {
    const branchId = req.user.branch_id || req.user.branch_context;
    
    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: 'User branch not found'
      });
    }

    // Get moveout lists from all users in the same branch
    const result = await query(
      `SELECT ml.*, u.name as created_by_name, u.email as created_by_email 
       FROM moveout_lists ml 
       JOIN users u ON ml.created_by = u.id 
       WHERE u.branch_id = $1 OR u.branch_context = $1 
       ORDER BY ml.created_at DESC`,
      [branchId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching moveout lists:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch moveout lists'
    });
  }
});

// Get a specific moveout list
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM moveout_lists WHERE id = $1 AND created_by = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Moveout list not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching moveout list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch moveout list'
    });
  }
});

// Create a new moveout list
router.post('/', 
  authenticateToken,
  authorize('manager', 'assistant_manager', 'staff'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('items').isArray().withMessage('Items must be an array'),
    body('items.*.item_id').isUUID().withMessage('Invalid item ID'),
    body('items.*.item_name').notEmpty().withMessage('Item name is required'),
    body('items.*.available_amount').isInt({ min: 0 }).withMessage('Available amount must be a positive integer'),
    body('items.*.request_amount').isInt({ min: 0 }).withMessage('Request amount must be a positive integer'),
    body('items.*.category').notEmpty().withMessage('Category is required')
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { items, title, description } = req.body;

      // Validate that request amounts don't exceed available amounts
      for (const item of items) {
        if (item.request_amount > item.available_amount) {
          return res.status(400).json({
            success: false,
            error: `Request amount (${item.request_amount}) cannot exceed available amount (${item.available_amount}) for item: ${item.item_name}`
          });
        }
      }

      // Create moveout list in transaction
      const result = await transaction(async (client) => {
        // Insert moveout list (using actual schema: created_by, items, status)
        const moveoutResult = await client.query(
          'INSERT INTO moveout_lists (created_by, items, status) VALUES ($1, $2, $3) RETURNING *',
          [req.user.id, JSON.stringify(items), 'draft']
        );

        // Log activity
        await client.query(
          'SELECT log_user_activity($1, $2, $3)',
          [
            req.user.id,
            'moveout_list_generated',
            JSON.stringify({
              list_id: moveoutResult.rows[0].id,
              item_count: items.length,
              title: title,
              description: description
            })
          ]
        );

        return moveoutResult.rows[0];
      });

      // Send notifications to staff in the same branch
      try {
        const branchId = req.user.branch_id || req.user.branch_context;
        if (branchId) {
          // Get staff members in the same branch
          const staffResult = await query(
            'SELECT id, name, email, phone FROM users WHERE (branch_id = $1 OR branch_context = $1) AND role IN ($2, $3) AND is_active = true',
            [branchId, 'staff', 'assistant_manager']
          );

          // Create notifications for each staff member
          for (const staff of staffResult.rows) {
            await query(
              'INSERT INTO notifications (user_id, title, message, type, data) VALUES ($1, $2, $3, $4, $5)',
              [
                staff.id,
                'New Moveout List Created',
                `${req.user.name} has created a new moveout list with ${items.length} items. Please review the items that need to be moved out.`,
                'moveout_list',
                JSON.stringify({
                  moveout_list_id: result.id,
                  created_by: req.user.name,
                  item_count: items.length,
                  items: items.map(item => ({
                    name: item.item_name,
                    request_amount: item.request_amount
                  }))
                })
              ]
            );
          }
        }
      } catch (notificationError) {
        console.warn('Failed to send notifications:', notificationError);
      }

      // Trigger frontend notification update
      triggerNotificationUpdate(req, req.user.branch_id || req.user.branch_context);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Moveout list created successfully'
      });
    } catch (error) {
      console.error('Error creating moveout list:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create moveout list'
      });
    }
  }
);

// Update moveout list status
router.patch('/:id/status', 
  authenticateToken,
  authorize('manager', 'assistant_manager', 'staff'),
  [
    body('status').isIn(['draft', 'generated', 'completed']).withMessage('Invalid status')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { status } = req.body;

      const result = await query(
        'UPDATE moveout_lists SET status = $1, updated_at = NOW() WHERE id = $2 AND created_by = $3 RETURNING *',
        [status, req.params.id, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Moveout list not found'
        });
      }

      // Log activity
      await query(
        'SELECT log_user_activity($1, $2, $3)',
        [
          req.user.id,
          'moveout_list_status_updated',
          JSON.stringify({
            list_id: req.params.id,
            new_status: status
          })
        ]
      );

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Moveout list status updated successfully'
      });
    } catch (error) {
      console.error('Error updating moveout list status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update moveout list status'
      });
    }
  }
);

// Delete moveout list
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM moveout_lists WHERE id = $1 AND created_by = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Moveout list not found'
      });
    }

    // Log activity
    await query(
      'SELECT log_user_activity($1, $2, $3)',
      [
        req.user.id,
        'moveout_list_deleted',
        JSON.stringify({
          list_id: req.params.id
        })
      ]
    );

    res.json({
      success: true,
      message: 'Moveout list deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting moveout list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete moveout list'
    });
  }
});

// Process a moveout item (mark as completed)
router.post('/:id/process-item', 
  authenticateToken,
  authorize('manager', 'assistant_manager', 'staff'),
  [
    body('itemId').isUUID().withMessage('Invalid item ID'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('userName').optional().isString().withMessage('User name must be a string')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { itemId, quantity, userName } = req.body;
      const listId = req.params.id;

      // First, verify the moveout list exists and is accessible to users in the same branch
      const branchId = req.user.branch_id || req.user.branch_context;
      const listResult = await query(
        `SELECT ml.* FROM moveout_lists ml 
         JOIN users u ON ml.created_by = u.id 
         WHERE ml.id = $1 AND (u.branch_id = $2 OR u.branch_context = $2)`,
        [listId, branchId]
      );

      if (listResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Moveout list not found'
        });
      }

      const moveoutList = listResult.rows[0];
      const items = moveoutList.items;

      // Find the item in the list
      const itemIndex = items.findIndex(item => item.item_id === itemId);
      if (itemIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Item not found in moveout list'
        });
      }

      const item = items[itemIndex];

      // Check if the quantity is valid
      if (quantity > item.request_amount) {
        return res.status(400).json({
          success: false,
          error: `Quantity (${quantity}) cannot exceed requested amount (${item.request_amount})`
        });
      }

      // Update the item status and processed quantity
      items[itemIndex] = {
        ...item,
        processed_quantity: quantity,
        processed_at: new Date().toISOString(),
        processed_by: userName || req.user.name,
        status: 'completed'
      };

      // Update the moveout list and deduct stock in a transaction
      const result = await transaction(async (client) => {
        // Update the moveout list in the database
        const updateResult = await client.query(
          'UPDATE moveout_lists SET items = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
          [JSON.stringify(items), listId]
        );

        // Deduct stock from inventory
        await client.query(
          'UPDATE stock SET current_quantity = current_quantity - $1, last_updated = NOW() WHERE item_id = $2',
          [quantity, itemId]
        );

        // Log activity
        await client.query(
          'SELECT log_user_activity($1, $2, $3)',
          [
            req.user.id,
            'moveout_item_processed',
            JSON.stringify({
              list_id: listId,
              item_id: itemId,
              item_name: item.item_name,
              quantity: quantity,
              processed_by: userName || req.user.name
            })
          ]
        );

        return updateResult.rows[0];
      });

      // Create immediate notification for item processing
      await query(
        'INSERT INTO notifications (user_id, title, message, type, data) VALUES ($1, $2, $3, $4, $5)',
        [
          req.user.id,
          `Item Processed`,
          `${item.item_name} (${quantity} units) has been deducted from stock`,
          'moveout_processed',
          JSON.stringify({
            item_name: item.item_name,
            quantity: quantity,
            list_id: listId,
            processed_by: userName || req.user.name
          })
        ]
      );

      // Trigger frontend notification update IMMEDIATELY after stock deduction
      console.log('📢 Moveout Lists: About to trigger notification update...');
      console.log('📢 Branch ID:', req.user.branch_id || req.user.branch_context);
      console.log('📢 Socket.IO available:', !!req.app.get('io'));
      triggerNotificationUpdate(req, req.user.branch_id || req.user.branch_context);
      console.log('📢 Moveout Lists: Notification update triggered');

      // Check for stock alerts after stock deduction (asynchronously)
      setImmediate(async () => {
        try {
          // Get current stock level and item details
          const stockResult = await query(`
            SELECT s.current_quantity, i.name as item_name, i.threshold_level
            FROM stock s
            JOIN items i ON s.item_id = i.id
            WHERE s.item_id = $1
          `, [itemId]);

          if (stockResult.rows.length === 0) {
            console.log(`⚠️ Item ${itemId} not found for stock alert check`);
            return;
          }

          const stockData = stockResult.rows[0];
          const newQuantity = stockData.current_quantity;
          const threshold = stockData.threshold_level;
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

          // Send stock alert to all subscribed users if needed
          if (alertType) {
            // Check if an alert was already sent recently for this item and stock level (within last 5 minutes)
            const recentAlertCheck = await query(`
              SELECT id FROM notifications 
              WHERE type = 'stock_alert' 
              AND data::text LIKE $1
              AND (data::text LIKE $2 OR data::text LIKE $3)
              AND created_at > NOW() - INTERVAL '5 minutes'
              LIMIT 1
            `, [`%"item_name":"${stockData.item_name}"%`, `%"source":"stock_out"%`, `%"source":"moveout_list"%`]);

            if (recentAlertCheck.rows.length > 0) {
              console.log(`⚠️ Alert already sent recently for "${stockData.item_name}" at ${newQuantity} units, skipping duplicate alert`);
              return;
            }

            // Get all users who should receive stock alerts
            const usersResult = await query(`
              SELECT u.id, u.phone, u.email, u.name, u.role, u.branch_context,
                     b.name as branch_name, d.name as district_name, r.name as region_name
              FROM users u
              LEFT JOIN branches b ON u.branch_context = b.id
              LEFT JOIN districts d ON b.district_id = d.id
              LEFT JOIN regions r ON d.region_id = r.id
              WHERE u.is_active = true
              AND (u.phone IS NOT NULL OR u.email IS NOT NULL)
            `);

            // Since notification_settings column doesn't exist, include all users for now
            const subscribedUsers = usersResult.rows;

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

            console.log(`📢 Sending ${alertType} stock alert for "${stockData.item_name}" to ${uniqueUsers.length} unique users (triggered by moveout list)`);

            // Send alerts to all unique subscribed users
            for (const user of uniqueUsers) {
              try {
                const phone = user.phone;
                const email = user.email;
                const userName = user.name;
                const isRegionalManager = user.role === 'regional_manager';
                
                // Since notification_settings column doesn't exist, enable notifications for all users
                const whatsappNotificationsEnabled = true;
                const emailNotificationsEnabled = true;

                // Create alert message
                const emoji = alertType === 'critical' ? '🚨' : alertType === 'low' ? '⚠️' : '📉';
                let message = `${emoji} STOCK ALERT - ${alertType.toUpperCase()} LEVEL\n\n`;
                message += `📦 Item: ${stockData.item_name}\n`;
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
                    `Stock Alert: ${stockData.item_name}`,
                    message,
                    'stock_alert',
                    JSON.stringify({
                      item_name: stockData.item_name,
                      current_quantity: newQuantity,
                      threshold: threshold,
                      alert_type: alertType,
                      source: 'moveout_list'
                    })
                  ]
                );

                // Send WhatsApp notification if enabled
                if (whatsappNotificationsEnabled && phone) {
                  try {
                    const whatsappResult = await whatsappService.sendMessage(phone, message);
                    if (whatsappResult.success) {
                      console.log(`✅ WhatsApp alert sent successfully to ${userName} (${phone})`);
                    } else {
                      console.error(`❌ Failed to send WhatsApp alert to ${userName}:`, whatsappResult.error);
                    }
                  } catch (whatsappError) {
                    console.error(`❌ Failed to send WhatsApp alert to ${userName}:`, whatsappError.message);
                  }
                }

                // Send email notification if enabled
                if (emailNotificationsEnabled && email) {
                  try {
                    const emailResult = await emailService.sendStockAlert(
                      email,
                      userName,
                      stockData.item_name,
                      newQuantity,
                      threshold,
                      alertType,
                      user.district_name,
                      user.branch_name
                    );
                    if (emailResult.success) {
                      console.log(`✅ Email alert sent successfully to ${userName} (${email})`);
                    } else {
                      console.error(`❌ Failed to send email alert to ${userName}:`, emailResult.error);
                    }
                  } catch (emailError) {
                    console.error(`❌ Failed to send email alert to ${userName}:`, emailError.message);
                  }
                }

              } catch (userError) {
                console.error(`❌ Error sending alert to user ${user.name}:`, userError.message);
              }
            }

            // Trigger another notification update after stock alerts are processed
            console.log('📢 Moveout Lists: Triggering second notification update after stock alerts...');
            triggerNotificationUpdate(req, req.user.branch_id || req.user.branch_context);
            console.log('📢 Moveout Lists: Second notification update triggered');
          }
        } catch (alertError) {
          console.error('❌ Error checking/sending stock alerts:', alertError.message);
        }
      });

      // Check if all items are completed and update list status
      const allItemsCompleted = items.every(item => item.status === 'completed');
      if (allItemsCompleted) {
        await query(
          'UPDATE moveout_lists SET status = $1, updated_at = NOW() WHERE id = $2',
          ['completed', listId]
        );
        // Update the result data to reflect the status change
        result.status = 'completed';
      }

      res.json({
        success: true,
        data: result,
        message: 'Moveout item processed successfully'
      });
    } catch (error) {
      console.error('Error processing moveout item:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process moveout item'
      });
    }
  }
);

module.exports = router;
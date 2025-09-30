const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all moveout lists for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM moveout_lists WHERE created_by = $1 ORDER BY created_at DESC',
      [req.user.id]
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
  authorize('manager', 'assistant_manager'),
  [
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

      const { items } = req.body;

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
        // Insert moveout list
        const moveoutResult = await client.query(
          'INSERT INTO moveout_lists (created_by, items, status) VALUES ($1, $2, $3) RETURNING *',
          [req.user.id, JSON.stringify(items), 'generated']
        );

        // Log activity
        await client.query(
          'SELECT log_user_activity($1, $2, $3)',
          [
            req.user.id,
            'moveout_list_generated',
            JSON.stringify({
              list_id: moveoutResult.rows[0].id,
              item_count: items.length
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
            'SELECT id, name, email, phone FROM users WHERE branch_id = $1 AND role IN ($2, $3) AND is_active = true',
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
  authorize('manager', 'assistant_manager'),
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

module.exports = router;



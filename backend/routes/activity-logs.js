const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const { query } = require('../config/database');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Get activity logs with optional filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { action, user_id, date_from, date_to } = req.query;
    
    let queryText = `
      SELECT al.*, u.name as user_name, u.email as user_email
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
    `;
    let params = [];
    let conditions = [];

    // Filter by branch for non-admin users
    if (req.user.role !== 'admin' && req.user.role !== 'regional_manager' && req.user.role !== 'district_manager') {
      conditions.push('u.branch_id = $' + (params.length + 1));
      params.push(req.user.branch_id);
    } else if ((req.user.role === 'regional_manager' || req.user.role === 'district_manager') && req.user.branch_context) {
      conditions.push('u.branch_id = $' + (params.length + 1));
      params.push(req.user.branch_context);
    }
    // For regional/district managers without branch_context, show all activities (no additional filter)

    // Additional filters
    if (action) {
      conditions.push('al.action = $' + (params.length + 1));
      params.push(action);
    }

    if (user_id) {
      conditions.push('al.user_id = $' + (params.length + 1));
      params.push(user_id);
    }

    if (date_from) {
      conditions.push('al.created_at >= $' + (params.length + 1));
      params.push(date_from);
    }

    if (date_to) {
      conditions.push('al.created_at <= $' + (params.length + 1));
      params.push(date_to);
    }

    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }

    queryText += ' ORDER BY al.created_at DESC LIMIT 100';

    const result = await query(queryText, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity logs'
    });
  }
});

// Create activity log
router.post('/', 
  authenticateToken,
  [
    body('action').notEmpty().withMessage('Action is required'),
    body('details').optional().isString(),
    body('entity_type').optional().isString(),
    body('entity_id').optional().isString()
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

      const { action, details, entity_type, entity_id } = req.body;
      const user_id = req.user.id;
      const branch_id = req.user.branch_id || req.user.branch_context;

      const result = await query(
        'INSERT INTO activity_logs (user_id, branch_id, action, details, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [user_id, branch_id, action, details, entity_type, entity_id]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Activity log created successfully'
      });
    } catch (error) {
      console.error('Error creating activity log:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create activity log'
      });
    }
  }
);

module.exports = router;




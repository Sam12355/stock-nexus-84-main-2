const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, authorize } = require('../middleware/auth');
const { query } = require('../config/database');

const router = express.Router();

// Get all items
router.get('/', authenticateToken, async (req, res) => {
  try {
    let queryText = 'SELECT * FROM items';
    let params = [];

    // Filter by branch only for managers (not for staff or admin)
    if (req.user.role === 'manager') {
      queryText += ' WHERE branch_id = $1';
      params.push(req.user.branch_id);
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch items'
    });
  }
});

// Create new item
router.post('/', 
  authenticateToken,
  authorize('admin', 'manager', 'assistant_manager'),
  [
    body('name').notEmpty().withMessage('Item name is required').isLength({ max: 100 }).withMessage('Name must be less than 100 characters'),
    body('category').isIn(['Gronsakshuset', 'Kvalitetsfisk', 'Spendrups', 'Tingstad', 'Other']).withMessage('Valid supplier is required'),
    body('description').optional().custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null, undefined, or empty string
      }
      if (typeof value === 'string' && value.length <= 500) {
        return true; // Allow non-empty strings up to 500 characters
      }
      throw new Error('Description must be a string with maximum 500 characters');
    }),
    body('image_url').optional().custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null, undefined, or empty string
      }
      if (typeof value === 'string' && (value.match(/^https?:\/\/.+/) || value.match(/^data:image\//))) {
        return true; // Allow valid URLs or base64 data URLs
      }
      throw new Error('Image must be a valid URL or uploaded file');
    }),
    body('storage_temperature').optional().custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null, undefined, or empty string
      }
      const num = parseFloat(value);
      if (!isNaN(num) && num >= -50 && num <= 100) {
        return true; // Allow valid temperature range
      }
      throw new Error('Temperature must be between -50°C and 100°C');
    }),
    body('threshold_level').isInt({ min: 1, max: 10000 }).withMessage('Threshold must be between 1 and 10,000'),
    body('low_level').optional().isInt({ min: 1, max: 10000 }).withMessage('Low level must be between 1 and 10,000'),
    body('critical_level').optional().isInt({ min: 1, max: 10000 }).withMessage('Critical level must be between 1 and 10,000'),
    body('branch_id').isUUID().withMessage('Valid branch ID is required'),
    body('created_by').isUUID().withMessage('Valid creator ID is required')
  ],
  async (req, res) => {
    try {
      console.log('🔍 Create item request body:', req.body);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { name, category, description, image_url, storage_temperature, threshold_level, low_level, critical_level, branch_id, created_by } = req.body;

      // Set default values if not provided
      const lowLevel = low_level || Math.max(1, Math.floor(threshold_level * 0.5));
      const criticalLevel = critical_level || Math.max(1, Math.floor(threshold_level * 0.2));

      // First, try to drop and recreate the constraint to allow new suppliers
      try {
        await query('ALTER TABLE items DROP CONSTRAINT IF EXISTS items_category_check');
        await query(`
          ALTER TABLE items ADD CONSTRAINT items_category_check 
          CHECK (category IN (
            'Gronsakshuset', 'Kvalitetsfisk', 'Spendrups', 'Tingstad', 'Other'
          ))
        `);
      } catch (constraintError) {
        console.log('Constraint update failed, continuing with insert:', constraintError.message);
      }

      const result = await query(
        'INSERT INTO items (name, category, description, image_url, storage_temperature, threshold_level, branch_id, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [name, category, description || null, image_url || null, storage_temperature || null, threshold_level, branch_id, created_by]
      );

      // Create initial stock record for the item
      await query(
        'INSERT INTO stock (item_id, current_quantity, updated_by) VALUES ($1, $2, $3)',
        [result.rows[0].id, 0, created_by]
      );

      // Log activity
      await query('SELECT log_user_activity($1, $2, $3)', [
        created_by,
        'item_created',
        JSON.stringify({ item_id: result.rows[0].id, name: name })
      ]);

      console.log('✅ Item created successfully:', result.rows[0].name);
      res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error creating item:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create item'
      });
    }
  }
);

// Update item
router.put('/:id',
  authenticateToken,
  authorize('admin', 'manager', 'assistant_manager'),
  [
    body('name').notEmpty().withMessage('Item name is required').isLength({ max: 100 }).withMessage('Name must be less than 100 characters'),
    body('category').isIn(['Gronsakshuset', 'Kvalitetsfisk', 'Spendrups', 'Tingstad', 'Other']).withMessage('Valid supplier is required'),
    body('description').optional().custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null, undefined, or empty string
      }
      if (typeof value === 'string' && value.length <= 500) {
        return true; // Allow non-empty strings up to 500 characters
      }
      throw new Error('Description must be a string with maximum 500 characters');
    }),
    body('image_url').optional().custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null, undefined, or empty string
      }
      if (typeof value === 'string' && (value.match(/^https?:\/\/.+/) || value.match(/^data:image\//))) {
        return true; // Allow valid URLs or base64 data URLs
      }
      throw new Error('Image must be a valid URL or uploaded file');
    }),
    body('storage_temperature').optional().custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null, undefined, or empty string
      }
      const num = parseFloat(value);
      if (!isNaN(num) && num >= -50 && num <= 100) {
        return true; // Allow valid temperature range
      }
      throw new Error('Temperature must be between -50°C and 100°C');
    }),
    body('threshold_level').isInt({ min: 1, max: 10000 }).withMessage('Threshold must be between 1 and 10,000'),
    body('low_level').optional().isInt({ min: 1, max: 10000 }).withMessage('Low level must be between 1 and 10,000'),
    body('critical_level').optional().isInt({ min: 1, max: 10000 }).withMessage('Critical level must be between 1 and 10,000')
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

      const { id } = req.params;
      const { name, category, description, image_url, storage_temperature, threshold_level, low_level, critical_level } = req.body;

      // Set default values if not provided
      const lowLevel = low_level || Math.max(1, Math.floor(threshold_level * 0.5));
      const criticalLevel = critical_level || Math.max(1, Math.floor(threshold_level * 0.2));

      const result = await query(
        'UPDATE items SET name = $1, category = $2, description = $3, image_url = $4, storage_temperature = $5, threshold_level = $6, updated_at = NOW() WHERE id = $7 RETURNING *',
        [name, category, description || null, image_url || null, storage_temperature || null, threshold_level, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Item not found'
        });
      }

      // Log activity
      await query('SELECT log_user_activity($1, $2, $3)', [
        req.user.id,
        'item_updated',
        JSON.stringify({ item_id: id, name: name })
      ]);

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating item:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update item'
      });
    }
  }
);

// Delete item
router.delete('/:id',
  authenticateToken,
  authorize('admin', 'manager', 'assistant_manager'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await query('DELETE FROM items WHERE id = $1 RETURNING *', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Item not found'
        });
      }

      // Log activity
      await query('SELECT log_user_activity($1, $2, $3)', [
        req.user.id,
        'item_deleted',
        JSON.stringify({ item_id: id })
      ]);

      res.json({
        success: true,
        message: 'Item deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete item'
      });
    }
  }
);

module.exports = router;



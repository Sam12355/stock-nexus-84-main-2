const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const { query } = require('../config/database');

const router = express.Router();

// Get all items
router.get('/', authenticateToken, async (req, res) => {
  try {
    let queryText = 'SELECT * FROM items';
    let params = [];

    // Filter by branch for non-admin users
    if (req.user.role !== 'admin' && req.user.role !== 'regional_manager' && req.user.role !== 'district_manager') {
      queryText += ' WHERE branch_id = $1';
      params.push(req.user.branch_id);
    } else if ((req.user.role === 'regional_manager' || req.user.role === 'district_manager') && req.user.branch_context) {
      queryText += ' WHERE branch_id = $1';
      params.push(req.user.branch_context);
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

module.exports = router;



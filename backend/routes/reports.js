const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../config/database');

const router = express.Router();

// Get stock report
router.get('/stock', authenticateToken, async (req, res) => {
  try {
    let queryText = `
      SELECT 
        i.id,
        i.name,
        i.category,
        i.threshold_level,
        s.current_quantity
      FROM items i
      LEFT JOIN stock s ON i.id = s.item_id
    `;
    let params = [];

    // Filter by branch for non-admin users
    if (req.user.role !== 'admin' && req.user.role !== 'regional_manager' && req.user.role !== 'district_manager') {
      queryText += ' WHERE i.branch_id = $1';
      params.push(req.user.branch_id);
    } else if ((req.user.role === 'regional_manager' || req.user.role === 'district_manager') && req.user.branch_context) {
      queryText += ' WHERE i.branch_id = $1';
      params.push(req.user.branch_context);
    }
    // For regional/district managers without branch_context, show all items

    queryText += ' ORDER BY i.name';

    const result = await query(queryText, params);

    // Transform the data to match frontend expectations
    const stockData = result.rows.map(row => {
      const currentQty = row.current_quantity || 0;
      const threshold = row.threshold_level;
      
      let status = 'adequate';
      if (currentQty <= threshold * 0.5) status = 'critical';
      else if (currentQty <= threshold) status = 'low';

      return {
        id: row.id,
        name: row.name,
        category: row.category,
        current_quantity: currentQty,
        threshold_level: threshold,
        status
      };
    });

    res.json({
      success: true,
      data: stockData
    });
  } catch (error) {
    console.error('Error fetching stock report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stock report'
    });
  }
});

// Get movements report
router.get('/movements', authenticateToken, async (req, res) => {
  try {
    let queryText = `
      SELECT 
        sm.id,
        sm.item_id,
        sm.movement_type,
        sm.quantity,
        sm.reason,
        sm.created_at,
        sm.created_by,
        i.name as item_name,
        u.name as user_name
      FROM stock_movements sm
      LEFT JOIN items i ON sm.item_id = i.id
      LEFT JOIN users u ON sm.created_by = u.id
    `;
    let params = [];

    // Filter by branch for non-admin users
    if (req.user.role !== 'admin' && req.user.role !== 'regional_manager' && req.user.role !== 'district_manager') {
      queryText += ' WHERE i.branch_id = $1';
      params.push(req.user.branch_id);
    } else if ((req.user.role === 'regional_manager' || req.user.role === 'district_manager') && req.user.branch_context) {
      queryText += ' WHERE i.branch_id = $1';
      params.push(req.user.branch_context);
    }
    // For regional/district managers without branch_context, show all movements

    queryText += ' ORDER BY sm.created_at DESC';

    const result = await query(queryText, params);

    // Transform the data to match frontend expectations
    const movementsData = result.rows.map(row => ({
      id: row.id,
      item_id: row.item_id,
      item_name: row.item_name,
      movement_type: row.movement_type,
      quantity: row.quantity,
      reason: row.reason,
      created_at: row.created_at,
      user_name: row.user_name
    }));

    res.json({
      success: true,
      data: movementsData
    });
  } catch (error) {
    console.error('Error fetching movements report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch movements report'
    });
  }
});

module.exports = router;




const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../config/database');

const router = express.Router();

// Get stock data with item details
router.get('/', authenticateToken, async (req, res) => {
  try {
    let queryText = `
      SELECT s.*, i.name, i.category, i.threshold_level, i.low_level, i.critical_level, i.image_url, i.branch_id
      FROM stock s
      JOIN items i ON s.item_id = i.id
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

    queryText += ' ORDER BY s.last_updated DESC';

    const result = await query(queryText, params);

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
        low_level: row.low_level,
        critical_level: row.critical_level,
        image_url: row.image_url,
        branch_id: row.branch_id
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
    const { item_id, movement_type, quantity, reason } = req.body;

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
      newQuantity = Math.max(0, currentQuantity - parseInt(quantity));
    }

    // Update stock quantity
    await query(
      'UPDATE stock SET current_quantity = $1, last_updated = NOW(), updated_by = $2 WHERE item_id = $3',
      [newQuantity, req.user.id, item_id]
    );

    // Log the movement
    await query(
      'INSERT INTO stock_movements (item_id, movement_type, quantity, reason, created_by, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
      [item_id, movement_type, parseInt(quantity), reason || null, req.user.id]
    );

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


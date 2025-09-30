const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../config/database');

const router = express.Router();

// Get analytics data
router.get('/', authenticateToken, async (req, res) => {
  try {
    let branchFilter = '';
    let params = [];

    // Filter by branch for non-admin users
    if (req.user.role !== 'admin' && req.user.role !== 'regional_manager' && req.user.role !== 'district_manager') {
      branchFilter = 'WHERE i.branch_id = $1';
      params.push(req.user.branch_id);
    } else if ((req.user.role === 'regional_manager' || req.user.role === 'district_manager') && req.user.branch_context) {
      branchFilter = 'WHERE i.branch_id = $1';
      params.push(req.user.branch_context);
    }

    // Get items with stock data
    const itemsQuery = `
      SELECT 
        i.id,
        i.name,
        i.category,
        i.threshold_level,
        s.current_quantity
      FROM items i
      LEFT JOIN stock s ON i.id = s.item_id
      ${branchFilter}
      ORDER BY i.name
    `;

    const itemsResult = await query(itemsQuery, params);
    const items = itemsResult.rows;

    // Calculate totals
    const totalItems = items.length;
    const lowStockItems = items.filter(item => 
      (item.current_quantity || 0) <= item.threshold_level
    ).length;

    // Get stock movements for last 7 days
    const movementsQuery = `
      SELECT 
        sm.id,
        sm.movement_type,
        sm.quantity,
        sm.created_at,
        i.name as item_name
      FROM stock_movements sm
      LEFT JOIN items i ON sm.item_id = i.id
      ${branchFilter}
      AND sm.created_at > NOW() - INTERVAL '7 days'
      ORDER BY sm.created_at DESC
    `;

    const movementsResult = await query(movementsQuery, params);
    const movements = movementsResult.rows;

    // Get active users
    const usersQuery = `
      SELECT COUNT(*) as active_users
      FROM users u
      WHERE u.is_active = true
      AND u.last_access > NOW() - INTERVAL '7 days'
      ${req.user.role !== 'admin' && req.user.role !== 'regional_manager' && req.user.role !== 'district_manager' 
        ? 'AND u.branch_id = $1' 
        : (req.user.role === 'regional_manager' || req.user.role === 'district_manager') && req.user.branch_context 
          ? 'AND u.branch_id = $1' 
          : ''
      }
    `;

    const usersResult = await query(usersQuery, params);
    const activeUsers = parseInt(usersResult.rows[0]?.active_users) || 0;

    res.json({
      success: true,
      data: {
        totalItems,
        lowStockItems,
        activeUsers,
        stockMovements: movements.length,
        items,
        movements
      }
    });
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics data'
    });
  }
});

// Get item usage analytics by time period
router.get('/item-usage/:period', authenticateToken, async (req, res) => {
  try {
    const { period } = req.params; // daily, monthly, yearly
    let branchFilter = '';
    let params = [];

    // Filter by branch for non-admin users
    if (req.user.role !== 'admin' && req.user.role !== 'regional_manager' && req.user.role !== 'district_manager') {
      branchFilter = 'WHERE i.branch_id = $1';
      params.push(req.user.branch_id);
    } else if ((req.user.role === 'regional_manager' || req.user.role === 'district_manager') && req.user.branch_context) {
      branchFilter = 'WHERE i.branch_id = $1';
      params.push(req.user.branch_context);
    }

    let dateFormat = '';
    let interval = '';
    let periods = [];

    const now = new Date();
    
    if (period === 'daily') {
      // Last 7 days
      dateFormat = 'YYYY-MM-DD';
      interval = '7 days';
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        periods.push(date.toISOString().split('T')[0]);
      }
    } else if (period === 'monthly') {
      // Last 6 months
      dateFormat = 'YYYY-MM';
      interval = '6 months';
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        periods.push(date.toISOString().slice(0, 7));
      }
    } else if (period === 'yearly') {
      // Last 3 years
      dateFormat = 'YYYY';
      interval = '3 years';
      for (let i = 2; i >= 0; i--) {
        const date = new Date(now);
        date.setFullYear(date.getFullYear() - i);
        periods.push(date.getFullYear().toString());
      }
    }

    // Get usage data for the specified period
    const usageQuery = `
      SELECT 
        DATE_TRUNC('${period === 'daily' ? 'day' : period === 'monthly' ? 'month' : 'year'}', sm.created_at) as period,
        SUM(sm.quantity) as usage
      FROM stock_movements sm
      LEFT JOIN items i ON sm.item_id = i.id
      ${branchFilter}
      AND sm.created_at > NOW() - INTERVAL '${interval}'
      GROUP BY DATE_TRUNC('${period === 'daily' ? 'day' : period === 'monthly' ? 'month' : 'year'}', sm.created_at)
      ORDER BY period
    `;

    const result = await query(usageQuery, params);
    
    // Create usage data with zero-filled periods
    const usageByPeriod = {};
    result.rows.forEach(row => {
      let periodKey = '';
      if (period === 'daily') {
        periodKey = row.period.toISOString().split('T')[0];
      } else if (period === 'monthly') {
        periodKey = row.period.toISOString().slice(0, 7);
      } else if (period === 'yearly') {
        periodKey = row.period.getFullYear().toString();
      }
      usageByPeriod[periodKey] = parseInt(row.usage) || 0;
    });

    const usageData = periods.map(period => ({
      period,
      usage: usageByPeriod[period] || 0
    }));

    res.json({
      success: true,
      data: usageData
    });
  } catch (error) {
    console.error('Error fetching item usage analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch item usage analytics'
    });
  }
});

module.exports = router;

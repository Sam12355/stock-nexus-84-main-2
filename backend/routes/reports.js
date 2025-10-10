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
    if (req.user.role !== 'admin') {
      queryText += ' WHERE i.branch_id = $1';
      params.push(req.user.branch_id);
    }

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
    if (req.user.role !== 'admin') {
      queryText += ' WHERE i.branch_id = $1';
      params.push(req.user.branch_id);
    }

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

// Get weekly soft drinks comparison report
router.get('/softdrinks-weekly', authenticateToken, async (req, res) => {
  try {
    const { weeks = 4 } = req.query; // Default to last 4 weeks
    
    let queryText = `
      WITH weekly_data AS (
        SELECT 
          DATE_TRUNC('week', sm.created_at) as week_start,
          DATE_TRUNC('week', sm.created_at) + INTERVAL '6 days' as week_end,
          sm.movement_type,
          SUM(sm.quantity) as total_quantity,
          i.name as item_name,
          i.id as item_id
        FROM stock_movements sm
        LEFT JOIN items i ON sm.item_id = i.id
        WHERE i.category = 'softdrinks'
        AND sm.created_at >= NOW() - INTERVAL '${parseInt(weeks)} weeks'
    `;
    
    let params = [];
    
    // Filter by branch for non-admin users
    if (req.user.role !== 'admin') {
      queryText += ' AND i.branch_id = $1';
      params.push(req.user.branch_id || req.user.branch_context);
    }
    
    queryText += `
        GROUP BY week_start, week_end, sm.movement_type, i.name, i.id
      ),
      weekly_summary AS (
        SELECT 
          week_start,
          week_end,
          item_id,
          item_name,
          SUM(CASE WHEN movement_type = 'in' THEN total_quantity ELSE 0 END) as stock_in,
          SUM(CASE WHEN movement_type = 'out' THEN total_quantity ELSE 0 END) as stock_out,
          SUM(CASE WHEN movement_type = 'in' THEN total_quantity ELSE 0 END) - 
          SUM(CASE WHEN movement_type = 'out' THEN total_quantity ELSE 0 END) as net_change
        FROM weekly_data
        GROUP BY week_start, week_end, item_id, item_name
      )
      SELECT 
        week_start,
        week_end,
        item_id,
        item_name,
        stock_in,
        stock_out,
        net_change,
        CASE 
          WHEN net_change > 0 THEN 'positive'
          WHEN net_change < 0 THEN 'negative'
          ELSE 'neutral'
        END as trend
      FROM weekly_summary
      ORDER BY week_start DESC, item_name
    `;

    const result = await query(queryText, params);
    
    // Group data by week for easier frontend consumption
    const weeklyData = {};
    
    result.rows.forEach(row => {
      const weekKey = `${row.week_start.toISOString().split('T')[0]}`;
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          week_start: row.week_start,
          week_end: row.week_end,
          items: [],
          total_stock_in: 0,
          total_stock_out: 0,
          total_net_change: 0
        };
      }
      
      weeklyData[weekKey].items.push({
        item_id: row.item_id,
        item_name: row.item_name,
        stock_in: row.stock_in,
        stock_out: row.stock_out,
        net_change: row.net_change,
        trend: row.trend
      });
      
      weeklyData[weekKey].total_stock_in += parseInt(row.stock_in) || 0;
      weeklyData[weekKey].total_stock_out += parseInt(row.stock_out) || 0;
      weeklyData[weekKey].total_net_change += parseInt(row.net_change) || 0;
    });

    // Convert to array and add overall trend and advice
    const weeklyArray = Object.values(weeklyData).map(week => {
      const overallTrend = week.total_net_change > 0 ? 'positive' : 
                          week.total_net_change < 0 ? 'negative' : 'neutral';
      
      // Generate advice based on trend
      let advice = '';
      if (overallTrend === 'positive') {
        advice = '📈 Great! You\'re gaining inventory. Consider maintaining current ordering patterns or slightly reducing if stock is accumulating too much.';
      } else if (overallTrend === 'negative') {
        advice = '📉 Warning! You\'re losing inventory faster than restocking. Consider increasing order quantities or frequency to prevent stockouts.';
      } else {
        advice = '➡️ Stable inventory levels. Current ordering patterns are working well - maintain current practices.';
      }
      
      // Add item-specific advice
      const itemAdvice = week.items.map(item => {
        let itemAdvice = '';
        if (item.trend === 'positive') {
          itemAdvice = `✅ ${item.item_name}: Stock growing well - maintain current ordering`;
        } else if (item.trend === 'negative') {
          itemAdvice = `⚠️ ${item.item_name}: High consumption - consider increasing order quantity`;
        } else {
          itemAdvice = `➡️ ${item.item_name}: Stable consumption - current ordering is adequate`;
        }
        return itemAdvice;
      });
      
      return {
        ...week,
        overall_trend: overallTrend,
        advice: advice,
        item_advice: itemAdvice
      };
    });

    res.json({
      success: true,
      data: weeklyArray,
      summary: {
        total_weeks: weeklyArray.length,
        total_stock_in: weeklyArray.reduce((sum, week) => sum + (parseInt(week.total_stock_in) || 0), 0),
        total_stock_out: weeklyArray.reduce((sum, week) => sum + (parseInt(week.total_stock_out) || 0), 0),
        total_net_change: weeklyArray.reduce((sum, week) => sum + (parseInt(week.total_net_change) || 0), 0)
      }
    });
  } catch (error) {
    console.error('Error fetching soft drinks weekly report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch soft drinks weekly report'
    });
  }
});

module.exports = router;




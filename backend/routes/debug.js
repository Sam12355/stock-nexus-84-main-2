const express = require('express');
const { query } = require('../config/database');

const router = express.Router();

// Debug endpoint to check database status
router.get('/debug/database', async (req, res) => {
  try {
    console.log('🔍 Debug: Checking database status...');
    
    const tables = ['users', 'branches', 'products', 'stock', 'transactions', 'staff'];
    const results = {};
    
    for (const table of tables) {
      try {
        const countResult = await query(`SELECT COUNT(*) as count FROM ${table}`);
        results[table] = {
          count: parseInt(countResult.rows[0].count),
          exists: true
        };
        
        // Get sample data for staff table
        if (table === 'staff' && results[table].count > 0) {
          try {
            const sampleResult = await query(`SELECT id, name, email, role FROM ${table} LIMIT 5`);
            results[table].sample = sampleResult.rows;
          } catch (error) {
            results[table].sampleError = error.message;
          }
        }
      } catch (error) {
        results[table] = {
          count: 0,
          exists: false,
          error: error.message
        };
      }
    }
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      database: results
    });
    
  } catch (error) {
    console.error('❌ Debug database error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

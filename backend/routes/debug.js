const express = require('express');
const { query } = require('../config/database');

const router = express.Router();

// Debug endpoint to add a user
router.post('/debug/add-user', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password required'
      });
    }
    
    const bcrypt = require('bcryptjs');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existingUser.rows.length > 0) {
      // Update existing user
      await query(
        'UPDATE users SET password_hash = $1, name = $2, role = $3 WHERE email = $4',
        [hashedPassword, name || 'Admin User', role || 'admin', email]
      );
      
      res.json({
        success: true,
        message: 'User updated successfully',
        user: { email, name: name || 'Admin User', role: role || 'admin' }
      });
    } else {
      // Create new user
      const result = await query(
        'INSERT INTO users (email, password_hash, name, role, phone, position) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, name, role',
        [email, hashedPassword, name || 'Admin User', role || 'admin', '+1234567890', 'System Admin']
      );
      
      res.json({
        success: true,
        message: 'User created successfully',
        user: result.rows[0]
      });
    }
    
  } catch (error) {
    console.error('Debug add user error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug endpoint to test login
router.post('/debug/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password required'
      });
    }
    
    // Check if user exists
    const userResult = await query(
      'SELECT id, email, password_hash, name, role FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    
    // For debug purposes, let's just return user info without password verification
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      message: 'User found (password verification skipped for debug)'
    });
    
  } catch (error) {
    console.error('Debug login error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug endpoint to check JWT configuration
router.get('/debug/jwt', (req, res) => {
  try {
    res.json({
      success: true,
      jwtSecret: process.env.JWT_SECRET ? 'Set' : 'Not set',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || 'Not set',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug endpoint to check database status
router.get('/debug/database', async (req, res) => {
  try {
    console.log('🔍 Debug: Checking database status...');
    
    const tables = ['users', 'branches', 'items', 'stock', 'stock_movements', 'districts', 'regions'];
    const results = {};
    
    for (const table of tables) {
      try {
        const countResult = await query(`SELECT COUNT(*) as count FROM ${table}`);
        results[table] = {
          count: parseInt(countResult.rows[0].count),
          exists: true
        };
        
        // Get sample data for users table (contains staff)
        if (table === 'users' && results[table].count > 0) {
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

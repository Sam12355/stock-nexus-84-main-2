const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('role').isIn(['admin', 'manager', 'assistant_manager', 'staff']).withMessage('Invalid role'),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number')
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

      const { email, password, name, role, phone, branch_id, position } = req.body;

      // Check if user already exists
      const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'User with this email already exists'
        });
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const result = await query(
        'INSERT INTO users (email, password_hash, name, role, phone, branch_id, position) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, name, role, branch_id, created_at',
        [email, passwordHash, name, role, phone, branch_id, position]
      );

      const user = result.rows[0];

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            branch_id: user.branch_id,
            created_at: user.created_at
          },
          token
        },
        message: 'User registered successfully'
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Registration failed'
      });
    }
  }
);

// Login user
router.post('/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
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

      const { email, password } = req.body;

      // Debug logging - check what's being received
      console.log('🔍 BACKEND LOGIN DEBUG:');
      console.log('Email received:', email);
      console.log('Password received:', password);
      console.log('Email length:', email ? email.length : 'undefined');
      console.log('Password length:', password ? password.length : 'undefined');

      // Get user from database
      const result = await query(
        'SELECT id, email, password_hash, name, role, branch_id, branch_context, phone, position, photo_url, is_active, access_count FROM users WHERE email = $1',
        [email]
      );

      console.log('🔍 DATABASE QUERY DEBUG:');
      console.log('Query result rows:', result.rows.length);
      console.log('User found:', result.rows.length > 0);
      if (result.rows.length > 0) {
        console.log('User email:', result.rows[0].email);
        console.log('User is_active:', result.rows[0].is_active);
        console.log('User password_hash exists:', !!result.rows[0].password_hash);
        console.log('Password hash length:', result.rows[0].password_hash ? result.rows[0].password_hash.length : 'N/A');
      }

      if (result.rows.length === 0) {
        console.log('❌ USER NOT FOUND IN DATABASE');
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      const user = result.rows[0];

      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          error: 'Account is deactivated'
        });
      }

      // Verify password
      console.log('🔍 PASSWORD VERIFICATION DEBUG:');
      console.log('Comparing password:', password);
      console.log('Against hash:', user.password_hash);
      
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      console.log('Password verification result:', isValidPassword);
      
      if (!isValidPassword) {
        console.log('❌ PASSWORD VERIFICATION FAILED');
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }
      
      console.log('✅ PASSWORD VERIFICATION SUCCESS');

      // Update last access and access count
      await query(
        'UPDATE users SET last_access = NOW(), access_count = access_count + 1 WHERE id = $1',
        [user.id]
      );

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Log activity
      await query(
        'SELECT log_user_activity($1, $2, $3, $4, $5)',
        [
          user.id,
          'user_login',
          JSON.stringify({ email: user.email }),
          req.ip,
          req.get('User-Agent')
        ]
      );

      // Get additional context information for greeting messages
      let districtName = null;
      let branchName = null;
      let regionName = null;
      
      if (user.branch_context) {
        // Get branch, district, and region names from branch_context
        const contextResult = await query(`
          SELECT b.name as branch_name, d.name as district_name, r.name as region_name
          FROM branches b
          LEFT JOIN districts d ON b.district_id = d.id
          LEFT JOIN regions r ON d.region_id = r.id
          WHERE b.id = $1
        `, [user.branch_context]);
        
        if (contextResult.rows.length > 0) {
          branchName = contextResult.rows[0].branch_name;
          districtName = contextResult.rows[0].district_name;
          regionName = contextResult.rows[0].region_name;
        }
      } else if (user.branch_id) {
        // Get branch, district, and region names from branch_id
        const branchResult = await query(`
          SELECT b.name as branch_name, d.name as district_name, r.name as region_name
          FROM branches b
          LEFT JOIN districts d ON b.district_id = d.id
          LEFT JOIN regions r ON d.region_id = r.id
          WHERE b.id = $1
        `, [user.branch_id]);
        
        if (branchResult.rows.length > 0) {
          branchName = branchResult.rows[0].branch_name;
          districtName = branchResult.rows[0].district_name;
          regionName = branchResult.rows[0].region_name;
        }
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            branch_id: user.branch_id,
            branch_context: user.branch_context,
            phone: user.phone,
            position: user.position,
            photo_url: user.photo_url,
            access_count: user.access_count + 1,
            district_name: districtName,
            branch_name: branchName,
            region_name: regionName
          },
          token
        },
        message: 'Login successful'
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed'
      });
    }
  }
);

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    console.log('🔍 Profile request received');
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.log('❌ No token provided in profile request');
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    console.log('🔑 Token found, verifying...');
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token verified for user:', decoded.userId);
    } catch (jwtError) {
      console.log('❌ JWT verification failed:', jwtError.message);
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    // Use basic profile query that works with current database schema
    console.log('🔍 Executing profile query for user:', decoded.userId);
    let result;
    try {
      result = await query(
        `SELECT id, email, name, role, branch_id, branch_context, phone, position, photo_url, access_count, last_access, created_at, 
                CASE WHEN branch_context IS NOT NULL THEN true ELSE false END as has_completed_selection
         FROM users WHERE id = $1 AND is_active = true`,
        [decoded.userId]
      );
      console.log('✅ Profile query successful, rows:', result.rows.length);
    } catch (dbError) {
      console.log('❌ Database query failed:', dbError.message);
      return res.status(500).json({
        success: false,
        error: 'Database error'
      });
    }

    if (result.rows.length === 0) {
      console.log('❌ User not found in database:', decoded.userId);
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log('✅ User found in database:', result.rows[0].email);

    const user = result.rows[0];

    // Get additional context information for greeting messages
    let districtName = null;
    let branchName = null;
    let regionName = null;
    
    if (user.branch_context) {
      // Get branch, district, and region names from branch_context
      const contextResult = await query(`
        SELECT b.name as branch_name, d.name as district_name, r.name as region_name
        FROM branches b
        LEFT JOIN districts d ON b.district_id = d.id
        LEFT JOIN regions r ON d.region_id = r.id
        WHERE b.id = $1
      `, [user.branch_context]);
      
      if (contextResult.rows.length > 0) {
        branchName = contextResult.rows[0].branch_name;
        districtName = contextResult.rows[0].district_name;
        regionName = contextResult.rows[0].region_name;
      }
    } else if (user.branch_id) {
      // Get branch, district, and region names from branch_id
      const branchResult = await query(`
        SELECT b.name as branch_name, d.name as district_name, r.name as region_name
        FROM branches b
        LEFT JOIN districts d ON b.district_id = d.id
        LEFT JOIN regions r ON d.region_id = r.id
        WHERE b.id = $1
      `, [user.branch_id]);
      
      if (branchResult.rows.length > 0) {
        branchName = branchResult.rows[0].branch_name;
        districtName = branchResult.rows[0].district_name;
        regionName = branchResult.rows[0].region_name;
      }
    }

    // Add location data to the user object
    const userWithLocation = {
      ...user,
      branch_name: branchName,
      district_name: districtName,
      region_name: regionName
    };

    console.log('✅ Profile response sent successfully for:', userWithLocation.email);
    res.json({
      success: true,
      data: userWithLocation
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query(
      'SELECT id, email, role FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];

    // Generate new token
    const newToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      data: { token: newToken },
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token'
    });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    const ip_address = req.ip || req.connection.remoteAddress;
    const user_agent = req.get('User-Agent');


    // Log activity
    await query(
      'SELECT log_user_activity($1, $2, $3, $4, $5)',
      [user_id, 'user_logout', JSON.stringify({ email: req.user.email }), ip_address, user_agent]
    );

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout'
    });
  }
});

module.exports = router;



const express = require('express');
const bcrypt = require('bcrypt');
const { authenticateToken, authorize } = require('../middleware/auth');
const { query } = require('../config/database');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, name, role, branch_id, phone, position, is_active, created_at FROM users ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// Get staff members
router.get('/staff', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Fetching staff members for user:', req.user.email, 'role:', req.user.role);
    
    let queryText = `
      SELECT u.id, u.email, u.name, u.role, u.branch_id, u.phone, u.position, u.photo_url, u.is_active, u.created_at, u.access_count, u.last_access, u.branch_context,
             b.name as branch_name, d.name as district_name, r.name as region_name
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN districts d ON b.district_id = d.id
      LEFT JOIN regions r ON d.region_id = r.id
      WHERE u.role IN ('staff', 'assistant_manager', 'manager')
      AND u.is_active = true
    `;
    let params = [];

    // Filter by branch for non-admin users
    if (req.user.role !== 'admin') {
      queryText += ' AND branch_id = $1';
      params.push(req.user.branch_id);
      console.log('🔍 Filtering by branch_id:', req.user.branch_id);
    }

    queryText += ' ORDER BY created_at DESC';

    console.log('🔍 Executing staff query:', queryText);
    const result = await query(queryText, params);
    console.log('✅ Found', result.rows.length, 'staff members');

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error fetching staff:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch staff'
    });
  }
});

// Create staff member
router.post('/staff', 
  authenticateToken,
  authorize('admin', 'manager'),
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().withMessage('Name is required'),
    body('role').isIn(['staff', 'assistant_manager', 'manager']).withMessage('Invalid role'),
    body('branch_id').optional().isUUID().withMessage('Valid branch ID is required'),
    body('phone').optional().custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null, undefined, or empty string
      }
      return typeof value === 'string'; // If present, must be a string
    }).withMessage('Phone must be a string'),
    body('position').optional().custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null, undefined, or empty string
      }
      return typeof value === 'string'; // If present, must be a string
    }).withMessage('Position must be a string')
  ],
  async (req, res) => {
    try {
      // Debug logging
      console.log('🔍 Create staff request body:', req.body);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email, password, name, role, branch_id, phone, position, region_id, district_id } = req.body;

      // Custom validation: branch_id is required for staff, assistant_manager, and manager roles
      if (['staff', 'assistant_manager', 'manager'].includes(role) && !branch_id) {
        return res.status(400).json({
          success: false,
          error: 'Branch ID is required for this role'
        });
      }

      // Check if user already exists (only active users)
      const existingActiveUser = await query(
        'SELECT id FROM users WHERE email = $1 AND is_active = true',
        [email]
      );

      if (existingActiveUser.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'User with this email already exists'
        });
      }

      // Check if there's an inactive user with this email
      const existingInactiveUser = await query(
        'SELECT id FROM users WHERE email = $1 AND is_active = false',
        [email]
      );

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      let result;
      
      if (existingInactiveUser.rows.length > 0) {
        // Reactivate and update the existing inactive user
        const inactiveUserId = existingInactiveUser.rows[0].id;
        
        // Set default notification settings based on role
        let defaultNotificationSettings = {
          email: true, // Email is always enabled by default
          sms: false,
          whatsapp: false,
          stockLevelAlerts: false,
          eventReminders: false
        };

        // For managers and assistant managers, turn off all notifications by default
        if (['manager', 'assistant_manager'].includes(role)) {
          defaultNotificationSettings = {
            email: false,
            sms: false,
            whatsapp: false,
            stockLevelAlerts: false,
            eventReminders: false
          };
        }

        try {
          // Try to update with district_id and notification_settings (if columns exist)
          result = await query(
            'UPDATE users SET password_hash = $1, name = $2, role = $3, branch_id = $4, phone = $5, position = $6, district_id = $7, is_active = true, notification_settings = $8, updated_at = NOW() WHERE id = $9 RETURNING id, email, name, role, branch_id, phone, position',
            [passwordHash, name, role, branch_id, phone || null, position || null, district_id || null, JSON.stringify(defaultNotificationSettings), inactiveUserId]
          );
        } catch (error) {
          // If district_id or notification_settings columns don't exist, fall back to basic update
          if (error.message.includes('district_id') || error.message.includes('notification_settings')) {
            result = await query(
              'UPDATE users SET password_hash = $1, name = $2, role = $3, branch_id = $4, phone = $5, position = $6, is_active = true, updated_at = NOW() WHERE id = $7 RETURNING id, email, name, role, branch_id, phone, position',
              [passwordHash, name, role, branch_id, phone || null, position || null, inactiveUserId]
            );
          } else {
            throw error;
          }
        }
      } else {
        // Create new user
        // Set default notification settings based on role
        let defaultNotificationSettings = {
          email: true, // Email is always enabled by default
          sms: false,
          whatsapp: false,
          stockLevelAlerts: false,
          eventReminders: false
        };

        // For managers and assistant managers, turn off all notifications by default
        if (['manager', 'assistant_manager'].includes(role)) {
          defaultNotificationSettings = {
            email: false,
            sms: false,
            whatsapp: false,
            stockLevelAlerts: false,
            eventReminders: false
          };
        }

        try {
          // Try to insert with district_id and notification_settings (if columns exist)
          result = await query(
            'INSERT INTO users (email, password_hash, name, role, branch_id, phone, position, district_id, is_active, notification_settings) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9) RETURNING id, email, name, role, branch_id, phone, position',
            [email, passwordHash, name, role, branch_id, phone || null, position || null, district_id || null, JSON.stringify(defaultNotificationSettings)]
          );
        } catch (error) {
          // If district_id or notification_settings columns don't exist, fall back to basic insert
          if (error.message.includes('district_id') || error.message.includes('notification_settings')) {
            result = await query(
              'INSERT INTO users (email, password_hash, name, role, branch_id, phone, position, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING id, email, name, role, branch_id, phone, position',
              [email, passwordHash, name, role, branch_id, phone || null, position || null]
            );
          } else {
            throw error;
          }
        }
      }

      // Log activity
      await query(
        'SELECT log_user_activity($1, $2, $3)',
        [
          req.user.id,
          'staff_created',
          JSON.stringify({
            staff_id: result.rows[0].id,
            name: name,
            role: role
          })
        ]
      );

      console.log('✅ Staff member created successfully:', result.rows[0].email);
      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Staff member created successfully'
      });
    } catch (error) {
      console.error('Error creating staff member:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create staff member'
      });
    }
  }
);

// Update staff member
router.put('/staff/:id',
  authenticateToken,
  authorize('admin', 'manager'),
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('role').optional().isIn(['staff', 'assistant_manager', 'manager']).withMessage('Invalid role'),
    body('branch_id').optional().isUUID().withMessage('Valid branch ID is required'),
    body('phone').optional().custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null, undefined, or empty string
      }
      return typeof value === 'string'; // If present, must be a string
    }).withMessage('Phone must be a string'),
    body('position').optional().custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null, undefined, or empty string
      }
      return typeof value === 'string'; // If present, must be a string
    }).withMessage('Position must be a string'),
    body('is_active').optional().isBoolean()
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
      const { name, role, branch_id, phone, position, is_active, password } = req.body;

      // Check if staff member exists
      const existingStaff = await query(
        'SELECT id, role FROM users WHERE id = $1 AND role IN ($2, $3, $4)',
        [id, 'staff', 'assistant_manager', 'manager']
      );

      if (existingStaff.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Staff member not found'
        });
      }

      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(name);
      }
      if (role !== undefined) {
        updates.push(`role = $${paramCount++}`);
        values.push(role);
      }
      if (branch_id !== undefined) {
        updates.push(`branch_id = $${paramCount++}`);
        values.push(branch_id);
      }
      if (phone !== undefined) {
        updates.push(`phone = $${paramCount++}`);
        values.push(phone);
      }
      if (position !== undefined) {
        updates.push(`position = $${paramCount++}`);
        values.push(position);
      }
      if (is_active !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        values.push(is_active);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update'
        });
      }

      // Add password update if provided and not empty
      if (password && password.trim() && password.trim().length >= 6) {
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password.trim(), saltRounds);
        updates.push(`password_hash = $${paramCount++}`);
        values.push(passwordHash);
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const queryText = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, email, name, role, branch_id, phone, position, is_active`;

      const result = await query(queryText, values);

      // Log activity
      await query(
        'SELECT log_user_activity($1, $2, $3)',
        [
          req.user.id,
          'staff_updated',
          JSON.stringify({
            staff_id: id,
            role: role || existingStaff.rows[0].role
          })
        ]
      );

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Staff member updated successfully'
      });
    } catch (error) {
      console.error('Error updating staff member:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update staff member'
      });
    }
  }
);

// Delete staff member
router.delete('/staff/:id',
  authenticateToken,
  authorize('admin', 'manager'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if staff member exists
      const existingStaff = await query(
        'SELECT id FROM users WHERE id = $1 AND role IN ($2, $3, $4)',
        [id, 'staff', 'assistant_manager', 'manager']
      );

      if (existingStaff.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Staff member not found'
        });
      }

      // Soft delete (set is_active to false)
      await query(
        'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1',
        [id]
      );

      // Log activity
      await query(
        'SELECT log_user_activity($1, $2, $3)',
        [
          req.user.id,
          'staff_deleted',
          JSON.stringify({ staff_id: id })
        ]
      );

      res.json({
        success: true,
        message: 'Staff member deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting staff member:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete staff member'
      });
    }
  }
);

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Profile update request for user:', req.user.email);
    console.log('🔍 Profile update body:', req.body);
    
    const { 
      name, 
      phone, 
      position,
      // Stock alert scheduling fields
      stock_alert_frequencies,
      daily_schedule_time,
      weekly_schedule_day,
      weekly_schedule_time,
      monthly_schedule_date,
      monthly_schedule_time,
      // Event reminder scheduling fields
      event_reminder_frequencies,
      event_daily_schedule_time,
      event_weekly_schedule_day,
      event_weekly_schedule_time,
      event_monthly_schedule_date,
      event_monthly_schedule_time,
      // Softdrink trends scheduling fields
      softdrink_trends_frequencies,
      softdrink_trends_daily_schedule_time,
      softdrink_trends_weekly_schedule_day,
      softdrink_trends_weekly_schedule_time,
      softdrink_trends_monthly_schedule_date,
      softdrink_trends_monthly_schedule_time
    } = req.body;
    const userId = req.user.id;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }
    if (position !== undefined) {
      updates.push(`position = $${paramCount++}`);
      values.push(position);
    }
    
    // Handle scheduling fields
    if (stock_alert_frequencies !== undefined) {
      updates.push(`stock_alert_frequencies = $${paramCount++}`);
      values.push(JSON.stringify(stock_alert_frequencies));
    }
    if (daily_schedule_time !== undefined) {
      updates.push(`daily_schedule_time = $${paramCount++}`);
      values.push(daily_schedule_time);
    }
    if (weekly_schedule_day !== undefined) {
      updates.push(`weekly_schedule_day = $${paramCount++}`);
      values.push(weekly_schedule_day);
    }
    if (weekly_schedule_time !== undefined) {
      updates.push(`weekly_schedule_time = $${paramCount++}`);
      values.push(weekly_schedule_time);
    }
    if (monthly_schedule_date !== undefined) {
      updates.push(`monthly_schedule_date = $${paramCount++}`);
      values.push(monthly_schedule_date);
    }
    if (monthly_schedule_time !== undefined) {
      updates.push(`monthly_schedule_time = $${paramCount++}`);
      values.push(monthly_schedule_time);
    }
    
    // Event reminder scheduling fields
    if (event_reminder_frequencies !== undefined) {
      updates.push(`event_reminder_frequencies = $${paramCount++}`);
      values.push(JSON.stringify(event_reminder_frequencies));
    }
    if (event_daily_schedule_time !== undefined) {
      updates.push(`event_daily_schedule_time = $${paramCount++}`);
      values.push(event_daily_schedule_time);
    }
    if (event_weekly_schedule_day !== undefined) {
      updates.push(`event_weekly_schedule_day = $${paramCount++}`);
      values.push(event_weekly_schedule_day);
    }
    if (event_weekly_schedule_time !== undefined) {
      updates.push(`event_weekly_schedule_time = $${paramCount++}`);
      values.push(event_weekly_schedule_time);
    }
    if (event_monthly_schedule_date !== undefined) {
      updates.push(`event_monthly_schedule_date = $${paramCount++}`);
      values.push(event_monthly_schedule_date);
    }
    if (event_monthly_schedule_time !== undefined) {
      updates.push(`event_monthly_schedule_time = $${paramCount++}`);
      values.push(event_monthly_schedule_time);
    }
    
    // Softdrink trends scheduling fields
    if (softdrink_trends_frequencies !== undefined) {
      updates.push(`softdrink_trends_frequencies = $${paramCount++}`);
      values.push(JSON.stringify(softdrink_trends_frequencies));
    }
    if (softdrink_trends_daily_schedule_time !== undefined) {
      updates.push(`softdrink_trends_daily_schedule_time = $${paramCount++}`);
      values.push(softdrink_trends_daily_schedule_time);
    }
    if (softdrink_trends_weekly_schedule_day !== undefined) {
      updates.push(`softdrink_trends_weekly_schedule_day = $${paramCount++}`);
      values.push(softdrink_trends_weekly_schedule_day);
    }
    if (softdrink_trends_weekly_schedule_time !== undefined) {
      updates.push(`softdrink_trends_weekly_schedule_time = $${paramCount++}`);
      values.push(softdrink_trends_weekly_schedule_time);
    }
    if (softdrink_trends_monthly_schedule_date !== undefined) {
      updates.push(`softdrink_trends_monthly_schedule_date = $${paramCount++}`);
      values.push(softdrink_trends_monthly_schedule_date);
    }
    if (softdrink_trends_monthly_schedule_time !== undefined) {
      updates.push(`softdrink_trends_monthly_schedule_time = $${paramCount++}`);
      values.push(softdrink_trends_monthly_schedule_time);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    values.push(userId);
    const queryText = `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING id, name, email, phone, position, role, branch_id, branch_context, created_at, updated_at`;

    console.log('🔍 Profile update query:', queryText);
    console.log('🔍 Profile update values:', values);
    const result = await query(queryText, values);

    if (result.rows.length === 0) {
      console.log('❌ User not found for profile update:', userId);
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log('✅ Profile updated successfully for:', result.rows[0].email);
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// Update user password
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long'
      });
    }

    // Get current user
    const userResult = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
    
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update password
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, userId]);

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update password'
    });
  }
});

  // Update user branch context
  router.put('/branch-context', authenticateToken, async (req, res) => {
    try {
      const { branch_id, user_id } = req.body;
      const userId = user_id || req.user.id;

      if (!branch_id) {
        return res.status(400).json({
          success: false,
          error: 'Branch ID is required'
        });
      }

      // Update user's branch context (selection completion is determined by branch_context existence)
      await query(
        'UPDATE users SET branch_context = $1, updated_at = NOW() WHERE id = $2',
        [branch_id, userId]
      );

      res.json({
        success: true,
        message: 'Branch context updated successfully'
      });
    } catch (error) {
      console.error('Error updating branch context:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update branch context'
      });
    }
  });

// Direct update branch context endpoint
router.post('/update-branch-context', authenticateToken, async (req, res) => {
  try {
    const { user_id, branch_id } = req.body;
    await query('UPDATE users SET branch_context = $1 WHERE id = $2', [branch_id, user_id]);
    res.json({ success: true, message: 'Branch context updated successfully' });
  } catch (error) {
    console.error('Error updating branch_context:', error);
    res.status(500).json({ success: false, error: 'Failed to update branch_context' });
  }
});

  // Reset selection completion status
  router.put('/reset-selection', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;

      // Reset selection completion status by clearing branch_context
      await query(
        'UPDATE users SET branch_context = NULL, updated_at = NOW() WHERE id = $1',
        [userId]
      );

      res.json({
        success: true,
        message: 'Selection status reset successfully'
      });
    } catch (error) {
      console.error('Error resetting selection status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset selection status'
      });
    }
  });

// Add district_id column to users table
router.post('/add-district-column', authenticateToken, async (req, res) => {
  try {
    // Add district_id column to users table
    await query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES districts(id) ON DELETE SET NULL',
      []
    );
    
    res.json({
      success: true,
      message: 'District ID column added to users table'
    });
  } catch (error) {
    console.error('Error adding district_id column:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add district_id column'
    });
  }
});

// Update district_id for a user (for testing)
router.post('/update-district-id', authenticateToken, async (req, res) => {
  try {
    const { user_id, district_id } = req.body;
    
    await query(
      'UPDATE users SET district_id = $1 WHERE id = $2',
      [district_id, user_id]
    );
    
    res.json({
      success: true,
      message: 'District ID updated successfully'
    });
  } catch (error) {
    console.error('Error updating district_id:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update district_id'
    });
  }
});

// Update user settings
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Update settings request for user:', req.user.email);
    console.log('🔍 Settings body:', req.body);
    
    const { notification_settings } = req.body;
    
    // Check if notification_settings column exists by trying to update it
    try {
      await query(
        'UPDATE users SET notification_settings = $1 WHERE id = $2',
        [JSON.stringify(notification_settings), req.user.id]
      );
      
      console.log('✅ Notification settings updated successfully');
      res.json({
        success: true,
        message: 'User settings updated successfully'
      });
    } catch (error) {
      if (error.message.includes('notification_settings')) {
        console.log('⚠️ notification_settings column does not exist, skipping update');
        res.json({
          success: true,
          message: 'Settings update skipped (column not available)',
          warning: 'Notification settings column not available in current database schema'
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Error updating user settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user settings: ' + error.message
    });
  }
});

module.exports = router;


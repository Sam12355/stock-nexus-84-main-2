const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getClient } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all district managers with their branch assignments
router.get('/district-managers', authenticateToken, async (req, res) => {
  try {
    // Only regional managers and admins can access this
    if (req.user.role !== 'regional_manager' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Regional manager or admin privileges required.'
      });
    }

    let whereClause = '';
    let params = [];

    // For regional managers, only show district managers from their region
    if (req.user.role === 'regional_manager') {
      // Get the regional manager's branch context to find their assigned region
      const userResult = await query('SELECT branch_context FROM users WHERE id = $1', [req.user.id]);
      
      if (userResult.rows.length === 0 || !userResult.rows[0].branch_context) {
        return res.status(403).json({
          success: false,
          error: 'Regional manager must complete branch selection first'
        });
      }

      // Get the region from the branch context
      const branchResult = await query(`
        SELECT d.region_id 
        FROM branches b 
        JOIN districts d ON b.district_id = d.id 
        WHERE b.id = $1
      `, [userResult.rows[0].branch_context]);

      if (branchResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Invalid branch context'
        });
      }

      const regionId = branchResult.rows[0].region_id;
      
      whereClause = `
        WHERE u.role = 'district_manager' 
        AND u.district_id IN (
          SELECT id FROM districts WHERE region_id = $1
        )
      `;
      params.push(regionId);
    } else {
      // Admin can see all district managers
      whereClause = "WHERE u.role = 'district_manager'";
    }

    const result = await query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.district_id,
        d.name as district_name,
        r.name as region_name,
        COUNT(dmba.branch_id) as assigned_branches_count,
        ARRAY_AGG(
          CASE 
            WHEN dmba.branch_id IS NOT NULL 
            THEN json_build_object(
              'id', b.id,
              'name', b.name,
              'district_id', b.district_id,
              'district_name', d2.name
            )
            ELSE NULL 
          END
        ) FILTER (WHERE dmba.branch_id IS NOT NULL) as assigned_branches
      FROM users u
      LEFT JOIN districts d ON u.district_id = d.id
      LEFT JOIN regions r ON d.region_id = r.id
      LEFT JOIN district_manager_branch_assignments dmba ON u.id = dmba.district_manager_id
      LEFT JOIN branches b ON dmba.branch_id = b.id
      LEFT JOIN districts d2 ON b.district_id = d2.id
      ${whereClause}
      AND u.is_active = true
      GROUP BY u.id, u.name, u.email, u.district_id, d.name, r.name
      ORDER BY u.name
    `, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching district managers:', error);
    
    // Check if it's a table doesn't exist error
    if (error.message && error.message.includes('relation "district_manager_branch_assignments" does not exist')) {
      return res.status(500).json({
        success: false,
        error: 'Database table not found. Please create the district_manager_branch_assignments table first.',
        details: 'The branch assignments table needs to be created before viewing assignments.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch district managers',
      details: error.message
    });
  }
});

// Get available branches for assignment (filtered by regional manager's region)
router.get('/available-branches', authenticateToken, async (req, res) => {
  try {
    // Only regional managers and admins can access this
    if (req.user.role !== 'regional_manager' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Regional manager or admin privileges required.'
      });
    }

    let whereClause = '';
    let params = [];

    // For regional managers, only show branches from their region
    if (req.user.role === 'regional_manager') {
      // Get the regional manager's branch context to find their assigned region
      const userResult = await query('SELECT branch_context FROM users WHERE id = $1', [req.user.id]);
      
      if (userResult.rows.length === 0 || !userResult.rows[0].branch_context) {
        return res.status(403).json({
          success: false,
          error: 'Regional manager must complete branch selection first'
        });
      }

      // Get the region from the branch context
      const branchResult = await query(`
        SELECT d.region_id 
        FROM branches b 
        JOIN districts d ON b.district_id = d.id 
        WHERE b.id = $1
      `, [userResult.rows[0].branch_context]);

      if (branchResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Invalid branch context'
        });
      }

      const regionId = branchResult.rows[0].region_id;
      
      whereClause = `
        WHERE d.region_id = $1
      `;
      params.push(regionId);
    }

    const result = await query(`
      SELECT 
        b.id,
        b.name,
        b.description,
        b.district_id,
        d.name as district_name,
        r.name as region_name
      FROM branches b
      JOIN districts d ON b.district_id = d.id
      JOIN regions r ON d.region_id = r.id
      ${whereClause}
      ORDER BY r.name, d.name, b.name
    `, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching available branches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available branches'
    });
  }
});

// Assign branches to a district manager
router.post('/assign', 
  authenticateToken,
  [
    body('district_manager_id').isUUID().withMessage('Valid district manager ID is required'),
    body('branch_ids').isArray().withMessage('Branch IDs must be an array'),
    body('branch_ids.*').isUUID().withMessage('Each branch ID must be a valid UUID')
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

      // Only regional managers and admins can assign branches
      if (req.user.role !== 'regional_manager' && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Regional manager or admin privileges required.'
        });
      }

      const { district_manager_id, branch_ids } = req.body;

      // Verify the district manager exists and is a district manager
      const dmResult = await query(`
        SELECT u.id, u.name, u.district_id, d.region_id
        FROM users u
        JOIN districts d ON u.district_id = d.id
        WHERE u.id = $1 AND u.role = 'district_manager' AND u.is_active = true
      `, [district_manager_id]);

      if (dmResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'District manager not found'
        });
      }

      const districtManager = dmResult.rows[0];

      // For regional managers, verify they can assign branches to this district manager
      if (req.user.role === 'regional_manager') {
        // Get the regional manager's branch context to find their assigned region
        const userResult = await query('SELECT branch_context FROM users WHERE id = $1', [req.user.id]);
        
        if (userResult.rows.length === 0 || !userResult.rows[0].branch_context) {
          return res.status(403).json({
            success: false,
            error: 'Regional manager must complete branch selection first'
          });
        }

        // Get the region from the branch context
        const branchResult = await query(`
          SELECT d.region_id 
          FROM branches b 
          JOIN districts d ON b.district_id = d.id 
          WHERE b.id = $1
        `, [userResult.rows[0].branch_context]);

        if (branchResult.rows.length === 0) {
          return res.status(403).json({
            success: false,
            error: 'Invalid branch context'
          });
        }

        const regionalManagerRegionId = branchResult.rows[0].region_id;

        // Verify the district manager belongs to the same region
        if (districtManager.region_id !== regionalManagerRegionId) {
          return res.status(403).json({
            success: false,
            error: 'You can only assign branches to district managers in your region'
          });
        }
      }

      // Verify all branches exist and belong to the same region as the district manager
      const branchResult = await query(`
        SELECT b.id, b.name, d.region_id
        FROM branches b
        JOIN districts d ON b.district_id = d.id
        WHERE b.id = ANY($1)
      `, [branch_ids]);

      if (branchResult.rows.length !== branch_ids.length) {
        return res.status(400).json({
          success: false,
          error: 'One or more branches not found'
        });
      }

      // Verify all branches belong to the same region as the district manager
      console.log('🔍 District Manager region_id:', districtManager.region_id);
      console.log('🔍 Branch region_ids:', branchResult.rows.map(b => b.region_id));
      
      const invalidBranches = branchResult.rows.filter(branch => branch.region_id !== districtManager.region_id);
      if (invalidBranches.length > 0) {
        console.log('❌ Invalid branches found:', invalidBranches);
        return res.status(400).json({
          success: false,
          error: 'All branches must belong to the same region as the district manager',
          details: `District manager region: ${districtManager.region_id}, Branch regions: ${invalidBranches.map(b => b.region_id).join(', ')}`
        });
      }

      // Start transaction
      const client = await getClient();
      try {
        await client.query('BEGIN');

        // Remove existing assignments for this district manager
        await client.query(
          'DELETE FROM district_manager_branch_assignments WHERE district_manager_id = $1',
          [district_manager_id]
        );

        // Insert new assignments
        for (const branch_id of branch_ids) {
          await client.query(`
            INSERT INTO district_manager_branch_assignments 
            (district_manager_id, branch_id, assigned_by, assigned_at)
            VALUES ($1, $2, $3, NOW())
          `, [district_manager_id, branch_id, req.user.id]);
        }

        await client.query('COMMIT');

        res.json({
          success: true,
          message: `Successfully assigned ${branch_ids.length} branch(es) to district manager`,
          data: {
            district_manager_id,
            assigned_branches: branch_ids.length
          }
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error assigning branches:', error);
      
      // Check if it's a table doesn't exist error
      if (error.message && error.message.includes('relation "district_manager_branch_assignments" does not exist')) {
        return res.status(500).json({
          success: false,
          error: 'Database table not found. Please create the district_manager_branch_assignments table first.',
          details: 'The branch assignments table needs to be created before assigning branches.'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to assign branches',
        details: error.message
      });
    }
  }
);

// Remove branch assignment from a district manager
router.delete('/unassign/:district_manager_id/:branch_id', authenticateToken, async (req, res) => {
  try {
    // Only regional managers and admins can unassign branches
    if (req.user.role !== 'regional_manager' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Regional manager or admin privileges required.'
      });
    }

    const { district_manager_id, branch_id } = req.params;

    // For regional managers, verify they can unassign this branch
    if (req.user.role === 'regional_manager') {
      // Get the regional manager's branch context to find their assigned region
      const userResult = await query('SELECT branch_context FROM users WHERE id = $1', [req.user.id]);
      
      if (userResult.rows.length === 0 || !userResult.rows[0].branch_context) {
        return res.status(403).json({
          success: false,
          error: 'Regional manager must complete branch selection first'
        });
      }

      // Get the region from the branch context
      const branchResult = await query(`
        SELECT d.region_id 
        FROM branches b 
        JOIN districts d ON b.district_id = d.id 
        WHERE b.id = $1
      `, [userResult.rows[0].branch_context]);

      if (branchResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Invalid branch context'
        });
      }

      const regionalManagerRegionId = branchResult.rows[0].region_id;

      // Verify the branch belongs to the regional manager's region
      const targetBranchResult = await query(`
        SELECT d.region_id
        FROM branches b
        JOIN districts d ON b.district_id = d.id
        WHERE b.id = $1
      `, [branch_id]);

      if (targetBranchResult.rows.length === 0 || targetBranchResult.rows[0].region_id !== regionalManagerRegionId) {
        return res.status(403).json({
          success: false,
          error: 'You can only unassign branches in your region'
        });
      }
    }

    const result = await query(
      'DELETE FROM district_manager_branch_assignments WHERE district_manager_id = $1 AND branch_id = $2',
      [district_manager_id, branch_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    res.json({
      success: true,
      message: 'Branch assignment removed successfully'
    });
  } catch (error) {
    console.error('Error removing branch assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove branch assignment'
    });
  }
});

// Get branch assignments for a specific district manager
router.get('/district-manager/:id', authenticateToken, async (req, res) => {
  try {
    // Allow district managers to access their own assignments, or regional managers/admins to access any
    if (req.user.role === 'district_manager' && req.user.id !== req.params.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own assignments.'
      });
    } else if (req.user.role !== 'regional_manager' && req.user.role !== 'admin' && req.user.role !== 'district_manager') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Regional manager, admin, or district manager privileges required.'
      });
    }

    const { id } = req.params;

    const result = await query(`
      SELECT 
        dmba.id,
        dmba.branch_id,
        b.name as branch_name,
        b.description as branch_description,
        d.name as district_name,
        r.name as region_name,
        dmba.assigned_at,
        assigned_by_user.name as assigned_by_name
      FROM district_manager_branch_assignments dmba
      JOIN branches b ON dmba.branch_id = b.id
      JOIN districts d ON b.district_id = d.id
      JOIN regions r ON d.region_id = r.id
      LEFT JOIN users assigned_by_user ON dmba.assigned_by = assigned_by_user.id
      WHERE dmba.district_manager_id = $1
      ORDER BY dmba.assigned_at DESC
    `, [id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching district manager assignments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch district manager assignments'
    });
  }
});

module.exports = router;

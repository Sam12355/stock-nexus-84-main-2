const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const { query } = require('../config/database');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Get all regions
router.get('/regions', authenticateToken, async (req, res) => {
  try {
    // Try to query with regional_manager_id, fallback if column doesn't exist
    let result;
    try {
      result = await query(`
        SELECT r.id, r.name, r.description, r.created_at,
               COALESCE(r.regional_manager_id, NULL) as regional_manager_id,
               u.name as regional_manager_name
        FROM regions r
        LEFT JOIN users u ON r.regional_manager_id = u.id
        ORDER BY r.name
      `);
    } catch (error) {
      if (error.message.includes('regional_manager_id')) {
        // Column doesn't exist, query without it
        result = await query(`
          SELECT r.id, r.name, r.description, r.created_at
          FROM regions r
          ORDER BY r.name
        `);
      } else {
        throw error;
      }
    }
    
    // Transform the data to match frontend expectations
    const regions = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      created_at: row.created_at,
      regional_manager_id: row.regional_manager_id,
      regional_manager: row.regional_manager_name ? {
        name: row.regional_manager_name
      } : null
    }));
    
    res.json({
      success: true,
      data: regions
    });
  } catch (error) {
    console.error('Error fetching regions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch regions'
    });
  }
});

// Create region
router.post('/regions', 
  authenticateToken,
  authorize('admin'),
  [
    body('name').notEmpty().withMessage('Region name is required'),
    body('description').optional().custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null, undefined, or empty string
      }
      if (typeof value === 'string' && value.length <= 500) {
        return true; // Allow non-empty strings up to 500 characters
      }
      throw new Error('Description must be a string with maximum 500 characters');
    }),
    body('regional_manager_id').optional().custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null/empty values
      }
      // Check if it's a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error('Invalid regional manager ID');
      }
      return true;
    })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { name, description, regional_manager_id } = req.body;

      // Try to insert with regional_manager_id, fallback if column doesn't exist
      let result;
      try {
        result = await query(
          'INSERT INTO regions (name, description, regional_manager_id) VALUES ($1, $2, $3) RETURNING id, name, description, regional_manager_id, created_at',
          [name, description || null, regional_manager_id || null]
        );
      } catch (error) {
        if (error.message.includes('regional_manager_id')) {
          // Column doesn't exist, insert without it
          result = await query(
            'INSERT INTO regions (name, description) VALUES ($1, $2) RETURNING id, name, description, created_at',
            [name, description || null]
          );
          // Add null values for regional manager fields
          result.rows[0].regional_manager_id = null;
        } else {
          throw error;
        }
      }

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Region created successfully'
      });
    } catch (error) {
      console.error('Error creating region:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create region'
      });
    }
  }
);

// Update region
router.put('/regions/:id',
  authenticateToken,
  authorize('admin'),
  [
    body('name').notEmpty().withMessage('Region name is required'),
    body('description').optional().custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null, undefined, or empty string
      }
      if (typeof value === 'string' && value.length <= 500) {
        return true; // Allow non-empty strings up to 500 characters
      }
      throw new Error('Description must be a string with maximum 500 characters');
    }),
    body('regional_manager_id').optional().custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null/empty values
      }
      // Check if it's a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error('Invalid regional manager ID');
      }
      return true;
    })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const { name, description, regional_manager_id } = req.body;

      // Try to update with regional_manager_id, fallback if column doesn't exist
      let result;
      try {
        result = await query(
          'UPDATE regions SET name = $1, description = $2, regional_manager_id = $3, updated_at = NOW() WHERE id = $4 RETURNING id, name, description, regional_manager_id, created_at',
          [name, description || null, regional_manager_id || null, id]
        );
      } catch (error) {
        if (error.message.includes('regional_manager_id')) {
          // Column doesn't exist, update without it
          result = await query(
            'UPDATE regions SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING id, name, description, created_at',
            [name, description || null, id]
          );
          // Add null values for regional manager fields
          result.rows[0].regional_manager_id = null;
        } else {
          throw error;
        }
      }

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Region not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Region updated successfully'
      });
    } catch (error) {
      console.error('Error updating region:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update region'
      });
    }
  }
);

// Delete region
router.delete('/regions/:id',
  authenticateToken,
  authorize('admin'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if region has districts
      const districtsResult = await query(
        'SELECT id FROM districts WHERE region_id = $1 LIMIT 1',
        [id]
      );

      if (districtsResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete region with existing districts'
        });
      }

      const result = await query(
        'DELETE FROM regions WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Region not found'
        });
      }

      res.json({
        success: true,
        message: 'Region deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting region:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete region'
      });
    }
  }
);

// Get districts (optionally filtered by region)
router.get('/districts', authenticateToken, async (req, res) => {
  try {
    const { region_id } = req.query;
    
    let queryText = `
      SELECT d.id, d.name, d.description, d.region_id, d.created_at,
             COALESCE(d.district_manager_id, NULL) as district_manager_id,
             u.name as district_manager_name,
             r.name as region_name
      FROM districts d
      LEFT JOIN regions r ON d.region_id = r.id
      LEFT JOIN users u ON d.district_manager_id = u.id
    `;
    let params = [];
    
    if (region_id) {
      queryText += ' WHERE d.region_id = $1';
      params.push(region_id);
    }
    
    queryText += ' ORDER BY d.name';
    
    const result = await query(queryText, params);
    
    // Transform the data to match frontend expectations
    const districts = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      region_id: row.region_id,
      created_at: row.created_at,
      district_manager_id: row.district_manager_id,
      district_manager: row.district_manager_name ? {
        name: row.district_manager_name
      } : null,
      region: {
        name: row.region_name
      }
    }));
    
    res.json({
      success: true,
      data: districts
    });
  } catch (error) {
    console.error('Error fetching districts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch districts'
    });
  }
});

// Create district
router.post('/districts', 
  authenticateToken,
  authorize('admin'),
  [
    body('name').notEmpty().withMessage('District name is required'),
    body('region_id').isUUID().withMessage('Valid region ID is required'),
    body('description').optional().custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null, undefined, or empty string
      }
      if (typeof value === 'string' && value.length <= 500) {
        return true; // Allow non-empty strings up to 500 characters
      }
      throw new Error('Description must be a string with maximum 500 characters');
    }),
    body('district_manager_id').optional().custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null/empty values
      }
      // Check if it's a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error('Invalid district manager ID');
      }
      return true;
    })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { name, region_id, description, district_manager_id } = req.body;

      const result = await query(
        'INSERT INTO districts (name, region_id, description, district_manager_id) VALUES ($1, $2, $3, $4) RETURNING id, name, region_id, description, district_manager_id, created_at',
        [name, region_id, description || null, district_manager_id || null]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'District created successfully'
      });
    } catch (error) {
      console.error('Error creating district:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create district'
      });
    }
  }
);

// Update district
router.put('/districts/:id',
  authenticateToken,
  authorize('admin'),
  [
    body('name').notEmpty().withMessage('District name is required'),
    body('region_id').isUUID().withMessage('Valid region ID is required'),
    body('description').optional().custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null, undefined, or empty string
      }
      if (typeof value === 'string' && value.length <= 500) {
        return true; // Allow non-empty strings up to 500 characters
      }
      throw new Error('Description must be a string with maximum 500 characters');
    }),
    body('district_manager_id').optional().custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null/empty values
      }
      // Check if it's a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error('Invalid district manager ID');
      }
      return true;
    })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const { name, region_id, description, district_manager_id } = req.body;

      const result = await query(
        'UPDATE districts SET name = $1, region_id = $2, description = $3, district_manager_id = $4 WHERE id = $5 RETURNING id, name, region_id, description, district_manager_id, created_at',
        [name, region_id, description || null, district_manager_id || null, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'District not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'District updated successfully'
      });
    } catch (error) {
      console.error('Error updating district:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update district'
      });
    }
  }
);

// Delete district
router.delete('/districts/:id',
  authenticateToken,
  authorize('admin'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if district has branches
      const branchesResult = await query(
        'SELECT id FROM branches WHERE district_id = $1 LIMIT 1',
        [id]
      );

      if (branchesResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete district with existing branches'
        });
      }

      const result = await query(
        'DELETE FROM districts WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'District not found'
        });
      }

      res.json({
        success: true,
        message: 'District deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting district:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete district'
      });
    }
  }
);

// Get branches (optionally filtered by district or regional manager)
router.get('/branches', authenticateToken, async (req, res) => {
  try {
    const { district_id } = req.query;
    
    let queryText = `
      SELECT b.id, b.name, b.address, b.district_id, b.created_at,
             d.name as district_name, d.region_id, r.name as region_name
      FROM branches b
      LEFT JOIN districts d ON b.district_id = d.id
      LEFT JOIN regions r ON d.region_id = r.id
    `;
    let params = [];
    
    if (district_id) {
      queryText += ' WHERE b.district_id = $1';
      params.push(district_id);
    }
    
    queryText += ' ORDER BY b.name';
    
    const result = await query(queryText, params);
    
    // Transform the data to match frontend expectations
    const branches = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      address: row.address,
      district_id: row.district_id,
      region_id: row.region_id, // This comes from the district table
      created_at: row.created_at,
      district: {
        name: row.district_name
      },
      region: {
        name: row.region_name
      }
    }));
    
    res.json({
      success: true,
      data: branches
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch branches'
    });
  }
});

// Create branch
router.post('/branches', 
  authenticateToken,
  authorize('admin'),
  [
    body('name').notEmpty().withMessage('Branch name is required'),
    body('district_id').isUUID().withMessage('Valid district ID is required'),
    body('region_id').optional().isUUID().withMessage('Valid region ID is required'),
    body('description').optional().custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null, undefined, or empty string
      }
      if (typeof value === 'string' && value.length <= 500) {
        return true; // Allow non-empty strings up to 500 characters
      }
      throw new Error('Description must be a string with maximum 500 characters');
    }),
    body('location').optional().custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null, undefined, or empty string
      }
      if (typeof value === 'string' && value.length <= 200) {
        return true; // Allow non-empty strings up to 200 characters
      }
      throw new Error('Location must be a string with maximum 200 characters');
    }),
    body('manager_name').optional().isString(),
    body('address').optional().isString(),
    body('phone').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { name, district_id, description, location, manager_name, address, phone } = req.body;
      
      console.log('🔍 Received branch data:', {
        name,
        district_id,
        description,
        location,
        manager_name,
        address,
        phone
      });

      const result = await query(
        'INSERT INTO branches (name, district_id, description, location, manager_name, address, phone) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, district_id, description, location, manager_name, address, phone, created_at',
        [name, district_id, description || null, location || null, manager_name, address, phone]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Branch created successfully'
      });
    } catch (error) {
      console.error('Error creating branch:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create branch'
      });
    }
  }
);

// Update branch
router.put('/branches/:id',
  authenticateToken,
  authorize('admin'),
  [
    body('name').notEmpty().withMessage('Branch name is required'),
    body('district_id').isUUID().withMessage('Valid district ID is required'),
    body('region_id').optional().isUUID().withMessage('Valid region ID is required'),
    body('description').optional().custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null, undefined, or empty string
      }
      if (typeof value === 'string' && value.length <= 500) {
        return true; // Allow non-empty strings up to 500 characters
      }
      throw new Error('Description must be a string with maximum 500 characters');
    }),
    body('location').optional().custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null, undefined, or empty string
      }
      if (typeof value === 'string' && value.length <= 200) {
        return true; // Allow non-empty strings up to 200 characters
      }
      throw new Error('Location must be a string with maximum 200 characters');
    }),
    body('manager_name').optional().isString(),
    body('address').optional().isString(),
    body('phone').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const { name, district_id, description, location, manager_name, address, phone } = req.body;
      
      console.log('🔍 Received branch data:', {
        name,
        district_id,
        description,
        location,
        manager_name,
        address,
        phone
      });

      const result = await query(
        'UPDATE branches SET name = $1, district_id = $2, description = $3, location = $4, manager_name = $5, address = $6, phone = $7 WHERE id = $8 RETURNING id, name, district_id, description, location, manager_name, address, phone, created_at',
        [name, district_id, description || null, location || null, manager_name, address, phone, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Branch not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Branch updated successfully'
      });
    } catch (error) {
      console.error('Error updating branch:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update branch'
      });
    }
  }
);

// Delete branch
router.delete('/branches/:id',
  authenticateToken,
  authorize('admin'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if branch has users
      const usersResult = await query(
        'SELECT id FROM users WHERE branch_id = $1 LIMIT 1',
        [id]
      );

      if (usersResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete branch with existing users'
        });
      }

      const result = await query(
        'DELETE FROM branches WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Branch not found'
        });
      }

      res.json({
        success: true,
        message: 'Branch deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting branch:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete branch'
      });
    }
  }
);

// Add regional_manager_id column to regions table
router.post('/regions/add-column', 
  authenticateToken,
  authorize('admin'),
  async (req, res) => {
    try {
      // Check if column already exists
      const checkResult = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'regions' AND column_name = 'regional_manager_id'
      `);
      
      if (checkResult.rows.length > 0) {
        return res.json({
          success: true,
          message: 'Column regional_manager_id already exists'
        });
      }
      
      // Add the column
      await query(`
        ALTER TABLE regions 
        ADD COLUMN regional_manager_id UUID REFERENCES users(id) ON DELETE SET NULL
      `);
      
      // Add unique constraint to prevent regional managers from being assigned to multiple regions
      await query(`
        ALTER TABLE regions 
        ADD CONSTRAINT unique_regional_manager UNIQUE (regional_manager_id)
      `);
      
      res.json({
        success: true,
        message: 'Column regional_manager_id added successfully'
      });
    } catch (error) {
      console.error('Error adding column:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add column: ' + error.message
      });
    }
  }
);

// Add unique constraint to prevent regional managers from being assigned to multiple regions
router.post('/regions/add-unique-constraint', 
  authenticateToken,
  authorize('admin'),
  async (req, res) => {
    try {
      // Check if constraint already exists
      const checkResult = await query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'regions' AND constraint_name = 'unique_regional_manager'
      `);
      
      if (checkResult.rows.length > 0) {
        return res.json({
          success: true,
          message: 'Unique constraint already exists'
        });
      }
      
      // Add the unique constraint
      await query(`
        ALTER TABLE regions 
        ADD CONSTRAINT unique_regional_manager UNIQUE (regional_manager_id)
      `);
      
      res.json({
        success: true,
        message: 'Unique constraint added successfully'
      });
    } catch (error) {
      console.error('Error adding constraint:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add constraint: ' + error.message
      });
    }
  }
);

// Get assigned regional managers
router.get('/regions/assigned-managers', 
  authenticateToken,
  async (req, res) => {
    try {
      const result = await query(`
        SELECT regional_manager_id
        FROM regions 
        WHERE regional_manager_id IS NOT NULL
      `);
      
      const assignedManagerIds = result.rows.map(row => row.regional_manager_id);
      
      res.json({
        success: true,
        data: assignedManagerIds
      });
    } catch (error) {
      console.error('Error fetching assigned managers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch assigned managers'
      });
    }
  }
);

// Get assigned district managers
router.get('/districts/assigned-managers', 
  authenticateToken,
  async (req, res) => {
    try {
      const result = await query(`
        SELECT district_manager_id
        FROM districts 
        WHERE district_manager_id IS NOT NULL
      `);
      
      const assignedManagerIds = result.rows.map(row => row.district_manager_id);
      
      res.json({
        success: true,
        data: assignedManagerIds
      });
    } catch (error) {
      console.error('Error fetching assigned district managers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch assigned district managers'
      });
    }
  }
);

// Add district manager and description columns to districts table
router.post('/districts/add-columns', 
  authenticateToken,
  authorize('admin'),
  async (req, res) => {
    try {
      // Check if columns already exist
      const checkResult = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'districts' AND column_name IN ('description', 'district_manager_id', 'created_at')
      `);
      
      const existingColumns = checkResult.rows.map(row => row.column_name);
      const columnsToAdd = [];
      
      if (!existingColumns.includes('description')) {
        columnsToAdd.push('ADD COLUMN description TEXT');
      }
      if (!existingColumns.includes('district_manager_id')) {
        columnsToAdd.push('ADD COLUMN district_manager_id UUID REFERENCES users(id) ON DELETE SET NULL');
      }
      if (!existingColumns.includes('created_at')) {
        columnsToAdd.push('ADD COLUMN created_at TIMESTAMP DEFAULT NOW()');
      }
      
      if (columnsToAdd.length === 0) {
        return res.json({
          success: true,
          message: 'All columns already exist'
        });
      }
      
      // Add the columns
      for (const columnSql of columnsToAdd) {
        await query(`ALTER TABLE districts ${columnSql}`);
      }
      
      // Add unique constraint for district managers
      try {
        await query(`
          ALTER TABLE districts 
          ADD CONSTRAINT unique_district_manager UNIQUE (district_manager_id)
        `);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
      
      res.json({
        success: true,
        message: 'Columns and constraint added successfully'
      });
    } catch (error) {
      console.error('Error adding columns:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add columns: ' + error.message
      });
    }
  }
);

// Add description, location, and created_at columns to branches table
router.post('/branches/add-columns', 
  authenticateToken,
  authorize('admin'),
  async (req, res) => {
    try {
      // Check if columns already exist
      const checkResult = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'branches' AND column_name IN ('description', 'location', 'created_at')
      `);
      
      const existingColumns = checkResult.rows.map(row => row.column_name);
      const columnsToAdd = [];
      
      if (!existingColumns.includes('description')) {
        columnsToAdd.push('ADD COLUMN description TEXT');
      }
      if (!existingColumns.includes('location')) {
        columnsToAdd.push('ADD COLUMN location TEXT');
      }
      if (!existingColumns.includes('created_at')) {
        columnsToAdd.push('ADD COLUMN created_at TIMESTAMP DEFAULT NOW()');
      }
      
      if (columnsToAdd.length === 0) {
        return res.json({
          success: true,
          message: 'All columns already exist'
        });
      }
      
      // Add the columns
      for (const columnSql of columnsToAdd) {
        await query(`ALTER TABLE branches ${columnSql}`);
      }
      
      res.json({
        success: true,
        message: 'Columns added successfully'
      });
    } catch (error) {
      console.error('Error adding columns:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add columns: ' + error.message
      });
    }
  }
);

// Update branch settings (notification settings, alert frequency, etc.)
router.put('/branches/:id/settings',
  authenticateToken,
  authorize('admin', 'manager'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { notification_settings, alert_frequency } = req.body;

      // Verify the branch exists and user has access
      const branchCheck = await query(
        'SELECT id, name FROM branches WHERE id = $1',
        [id]
      );

      if (branchCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Branch not found'
        });
      }

      // Update notification settings if provided
      if (notification_settings) {
        await query(
          'UPDATE branches SET notification_settings = $1 WHERE id = $2',
          [JSON.stringify(notification_settings), id]
        );
      }

      // Update alert frequency if provided
      if (alert_frequency) {
        await query(
          'UPDATE branches SET alert_frequency = $1 WHERE id = $2',
          [alert_frequency, id]
        );
      }

      // Get updated branch data
      const updatedBranch = await query(
        'SELECT id, name, notification_settings, alert_frequency FROM branches WHERE id = $1',
        [id]
      );

      res.json({
        success: true,
        data: updatedBranch.rows[0],
        message: 'Branch settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating branch settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update branch settings: ' + error.message
      });
    }
  }
);

module.exports = router;

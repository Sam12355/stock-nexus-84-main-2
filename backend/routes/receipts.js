const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, authorize } = require('../middleware/auth');
const { query } = require('../config/database');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/receipts');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `receipt-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and PDF files are allowed'), false);
    }
  }
});

// Get all receipts (for managers and staff)
router.get('/', authenticateToken, authorize('admin', 'manager', 'assistant_manager', 'staff'), async (req, res) => {
  try {
    let queryText = `
      SELECT sr.*, u.name as submitted_by_name, r.name as reviewed_by_name, b.name as branch_name
      FROM stock_receipts sr
      LEFT JOIN users u ON sr.submitted_by = u.id
      LEFT JOIN users r ON sr.reviewed_by = r.id
      LEFT JOIN branches b ON sr.branch_id = b.id
    `;
    let params = [];

    // Filter by role
    if (req.user.role === 'admin') {
      // Admin can see all receipts
    } else if (req.user.role === 'staff') {
      // Staff can only see their own receipts
      queryText += ' WHERE sr.submitted_by = $1';
      params.push(req.user.id);
    } else {
      // Managers and assistant managers can see all receipts in their branch
      queryText += ' WHERE sr.branch_id = $1';
      params.push(req.user.branch_id);
    }

    queryText += ' ORDER BY sr.created_at DESC';

    const result = await query(queryText, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch receipts'
    });
  }
});

// Submit new receipt (for staff)
router.post('/submit', 
  authenticateToken,
  authorize('staff'),
  upload.single('receipt'),
  [
    body('supplier_name').notEmpty().withMessage('Supplier name is required'),
    body('remarks').optional().isString().withMessage('Remarks must be a string')
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

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Receipt file is required'
        });
      }

      const { supplier_name, remarks } = req.body;
      const filePath = req.file.path;
      const fileName = req.file.originalname;

      const result = await query(
        `INSERT INTO stock_receipts (supplier_name, receipt_file_path, receipt_file_name, remarks, submitted_by, branch_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [supplier_name, filePath, fileName, remarks || null, req.user.id, req.user.branch_id]
      );

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Receipt submitted successfully'
      });
    } catch (error) {
      console.error('Error submitting receipt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit receipt'
      });
    }
  }
);

// Update receipt status (for managers)
router.put('/:id/status',
  authenticateToken,
  authorize('admin', 'manager', 'assistant_manager'),
  [
    body('status').isIn(['pending', 'approved', 'rejected']).withMessage('Invalid status')
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
      const { status } = req.body;

      // Check if receipt exists and user has permission
      let checkQuery = 'SELECT * FROM stock_receipts WHERE id = $1';
      let checkParams = [id];

      if (req.user.role !== 'admin') {
        checkQuery += ' AND branch_id = $2';
        checkParams.push(req.user.branch_id);
      }

      const checkResult = await query(checkQuery, checkParams);
      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Receipt not found'
        });
      }

      const updateResult = await query(
        `UPDATE stock_receipts 
         SET status = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [status, req.user.id, id]
      );

      res.json({
        success: true,
        data: updateResult.rows[0],
        message: 'Receipt status updated successfully'
      });
    } catch (error) {
      console.error('Error updating receipt status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update receipt status'
      });
    }
  }
);

// Get receipt file
router.get('/:id/file', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT receipt_file_path, receipt_file_name FROM stock_receipts WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found'
      });
    }

    const { receipt_file_path, receipt_file_name } = result.rows[0];

    if (!fs.existsSync(receipt_file_path)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    res.download(receipt_file_path, receipt_file_name);
  } catch (error) {
    console.error('Error downloading receipt file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download receipt file'
    });
  }
});

module.exports = router;

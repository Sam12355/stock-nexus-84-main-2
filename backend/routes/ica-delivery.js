const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get all ICA delivery records
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM ica_delivery 
      ORDER BY submitted_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching ICA delivery records:', error);
    res.status(500).json({ error: 'Failed to fetch ICA delivery records' });
  }
});

// Create new ICA delivery order
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { userName, entries, submittedAt } = req.body;

    if (!userName || !entries || entries.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert each entry
    for (const entry of entries) {
      await query(`
        INSERT INTO ica_delivery (
          user_name, 
          type, 
          amount, 
          time_of_day, 
          submitted_at
        ) VALUES ($1, $2, $3, $4, $5)
      `, [userName, entry.type, parseInt(entry.amount), entry.timeOfDay, submittedAt]);
    }

    res.json({ success: true, message: 'ICA delivery order submitted successfully' });
  } catch (error) {
    console.error('Error creating ICA delivery order:', error);
    res.status(500).json({ error: 'Failed to create ICA delivery order' });
  }
});

// Delete ICA delivery record
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM ica_delivery WHERE id = $1', [id]);
    res.json({ success: true, message: 'ICA delivery record deleted successfully' });
  } catch (error) {
    console.error('Error deleting ICA delivery record:', error);
    res.status(500).json({ error: 'Failed to delete ICA delivery record' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get all ICA delivery records (with optional date filter)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { date, startDate, endDate } = req.query;
    
    let queryText = 'SELECT * FROM ica_delivery';
    let params = [];
    let conditions = [];
    
    if (date) {
      conditions.push(`DATE(submitted_at) = $${params.length + 1}`);
      params.push(date);
    } else if (startDate && endDate) {
      conditions.push(`DATE(submitted_at) BETWEEN $${params.length + 1} AND $${params.length + 2}`);
      params.push(startDate, endDate);
    } else if (startDate) {
      conditions.push(`DATE(submitted_at) >= $${params.length + 1}`);
      params.push(startDate);
    } else if (endDate) {
      conditions.push(`DATE(submitted_at) <= $${params.length + 1}`);
      params.push(endDate);
    }
    
    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }
    
    queryText += ' ORDER BY submitted_at DESC';
    
    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching ICA delivery records:', error);
    res.status(500).json({ error: 'Failed to fetch ICA delivery records' });
  }
});

// Get my submissions for today (with 1-hour edit window check)
router.get('/my-submissions', authenticateToken, async (req, res) => {
  try {
    const userName = req.user.name;
    const today = new Date().toISOString().split('T')[0];
    
    const result = await query(`
      SELECT *, 
        EXTRACT(EPOCH FROM (NOW() - submitted_at))/3600 as hours_since_submission
      FROM ica_delivery 
      WHERE user_name = $1 
        AND DATE(submitted_at) = $2
      ORDER BY submitted_at DESC
    `, [userName, today]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching my submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// Create new ICA delivery order
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { userName, entries, submittedAt } = req.body;

    console.log('ICA Delivery POST request:', { userName, entries: entries?.length, submittedAt, userId: req.user?.id });

    if (!userName || !entries || entries.length === 0) {
      console.error('Missing required fields:', { userName, entriesLength: entries?.length });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user already submitted for this time period today
    const today = new Date(submittedAt).toISOString().split('T')[0];
    const timeOfDay = entries[0]?.timeOfDay; // All entries should have same time of day
    
    console.log('Checking for existing submission:', { userName, today, timeOfDay });
    
    const existingSubmission = await query(`
      SELECT user_name FROM ica_delivery 
      WHERE user_name = $1 
        AND DATE(submitted_at) = $2
        AND time_of_day = $3
      LIMIT 1
    `, [userName, today, timeOfDay]);
    
    if (existingSubmission.rows.length > 0) {
      console.log('Duplicate submission detected');
      return res.status(400).json({ 
        error: `${userName} has already submitted the delivery`,
        duplicate: true 
      });
    }

    // Insert each entry
    console.log('Inserting entries...');
    for (const entry of entries) {
      console.log('Inserting entry:', { type: entry.type, amount: entry.amount, timeOfDay: entry.timeOfDay });
      await query(`
        INSERT INTO ica_delivery (
          user_id,
          user_name, 
          type, 
          amount, 
          time_of_day, 
          submitted_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [null, userName, entry.type, parseInt(entry.amount), entry.timeOfDay, submittedAt]);
    }

    console.log('ICA delivery order submitted successfully');
    res.json({ success: true, message: 'ICA delivery order submitted successfully' });
  } catch (error) {
    console.error('Error creating ICA delivery order:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to create ICA delivery order', details: error.message });
  }
});

// Update ICA delivery record (only within 1 hour)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, timeOfDay } = req.body;
    const userName = req.user.name;
    
    // Check if record exists and belongs to user
    const record = await query(`
      SELECT *, 
        EXTRACT(EPOCH FROM (NOW() - submitted_at))/3600 as hours_since_submission
      FROM ica_delivery 
      WHERE id = $1 AND user_name = $2
    `, [id, userName]);
    
    if (record.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found or unauthorized' });
    }
    
    const hoursSince = record.rows[0].hours_since_submission;
    if (hoursSince > 1) {
      return res.status(403).json({ error: 'Edit window expired (1 hour limit)' });
    }
    
    // Update the record
    await query(`
      UPDATE ica_delivery 
      SET amount = $1, time_of_day = $2
      WHERE id = $3
    `, [parseInt(amount), timeOfDay, id]);
    
    res.json({ success: true, message: 'Record updated successfully' });
  } catch (error) {
    console.error('Error updating ICA delivery record:', error);
    res.status(500).json({ error: 'Failed to update record' });
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

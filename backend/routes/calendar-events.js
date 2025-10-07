const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../config/database');
const { triggerNotificationUpdate } = require('./notifications');

const router = express.Router();

// Get calendar events
router.get('/', authenticateToken, async (req, res) => {
  try {
    // First, ensure the calendar_events table exists
    await query(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_date DATE NOT NULL,
        event_type VARCHAR(50) DEFAULT 'general',
        branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create indexes if they don't exist
    await query(`
      CREATE INDEX IF NOT EXISTS idx_calendar_events_branch_id ON calendar_events(branch_id);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_event_date ON calendar_events(event_date);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);
    `);

    // No sample data insertion - only show real events from database

    // Fetch events from database
    const result = await query(`
      SELECT ce.*, b.name as branch_name, u.name as created_by_name
      FROM calendar_events ce
      LEFT JOIN branches b ON ce.branch_id = b.id
      LEFT JOIN users u ON ce.created_by = u.id
      WHERE ce.event_date >= CURRENT_DATE
      ORDER BY ce.event_date ASC
      LIMIT 20
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calendar events'
    });
  }
});

// Create calendar event
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, event_date, event_type, branch_id } = req.body;
    const user_id = req.user.id;

    // Validate required fields
    if (!title || !event_date) {
      return res.status(400).json({
        success: false,
        error: 'Title and event_date are required'
      });
    }

    // Insert the new event
    const result = await query(`
      INSERT INTO calendar_events (title, description, event_date, event_type, branch_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [title, description, event_date, event_type || 'general', branch_id, user_id]);

    // Trigger frontend notification update
    triggerNotificationUpdate(req, req.user.branch_id || req.user.branch_context);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Event created successfully'
    });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create calendar event'
    });
  }
});

// Clear all calendar events (for testing)
router.delete('/clear', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM calendar_events');
    res.json({
      success: true,
      message: 'All calendar events cleared'
    });
  } catch (error) {
    console.error('Error clearing calendar events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear calendar events'
    });
  }
});

module.exports = router;

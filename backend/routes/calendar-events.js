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

    // Emit real-time new_event socket event to branch
    const io = global.socketIO;
    const targetBranch = branch_id || req.user.branch_id || req.user.branch_context;
    if (io && targetBranch) {
      io.to(`branch_${targetBranch}`).emit('new_event', {
        id: result.rows[0].id,
        title: title,
        event_date: event_date,
        description: description || '',
        branch_id: targetBranch,
        created_by: user_id,
        created_at: new Date().toISOString()
      });
      console.log(`📢 Socket.IO: Emitted new_event to branch_${targetBranch} for ${title}`);
    }

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

// Debug endpoint to check event reminder configuration
router.get('/debug-reminders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's event reminder settings
    const userResult = await query(`
      SELECT id, name, email, 
             event_reminder_frequencies,
             event_daily_schedule_time,
             event_weekly_schedule_day,
             event_weekly_schedule_time,
             event_monthly_schedule_date,
             event_monthly_schedule_time,
             notification_settings,
             branch_context
      FROM users
      WHERE id = $1
    `, [userId]);
    
    const user = userResult.rows[0];
    
    // Get upcoming events
    const eventsResult = await query(`
      SELECT id, title, event_date, branch_id
      FROM calendar_events
      WHERE event_date >= CURRENT_DATE
      AND event_date <= CURRENT_DATE + INTERVAL '30 days'
      ORDER BY event_date ASC
    `);
    
    // Check if eventReminders is enabled
    let eventRemindersEnabled = false;
    if (user.notification_settings) {
      try {
        const settings = typeof user.notification_settings === 'string' 
          ? JSON.parse(user.notification_settings) 
          : user.notification_settings;
        eventRemindersEnabled = settings.eventReminders === true;
      } catch (err) {
        // ignore
      }
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        event_reminder_frequencies: user.event_reminder_frequencies,
        event_daily_schedule_time: user.event_daily_schedule_time,
        event_weekly_schedule_day: user.event_weekly_schedule_day,
        event_weekly_schedule_time: user.event_weekly_schedule_time,
        event_monthly_schedule_date: user.event_monthly_schedule_date,
        event_monthly_schedule_time: user.event_monthly_schedule_time,
        eventRemindersEnabled: eventRemindersEnabled,
        branch_context: user.branch_context
      },
      upcomingEvents: eventsResult.rows,
      currentTime: new Date().toISOString(),
      swedenTime: new Date().toLocaleString("en-US", {timeZone: "Europe/Stockholm"})
    });
  } catch (error) {
    console.error('Error debugging event reminders:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

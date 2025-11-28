const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Register or update a device token
// POST /api/devices/register
// body: { user_id, device_id (optional), device_token }
router.post('/register', authenticateToken, async (req, res) => {
  const { user_id, device_id, device_token } = req.body;
  if (!user_id || !device_token) return res.status(400).json({ success: false, error: 'Missing user_id or device_token' });
  try {
    // Upsert device by user_id + device_id if provided, otherwise insert new
    if (device_id) {
      await query(
        `INSERT INTO devices (user_id, device_id, device_token, last_seen)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (device_id) DO UPDATE SET device_token = EXCLUDED.device_token, last_seen = NOW()`,
        [user_id, device_id, device_token]
      );
    } else {
      // Insert a new device row; duplicates of token are allowed but indexed
      await query(
        `INSERT INTO devices (user_id, device_token, last_seen) VALUES ($1, $2, NOW())`,
        [user_id, device_token]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error registering device:', err?.message || err);
    res.status(500).json({ success: false, error: err?.message || 'error' });
  }
});

// Unregister a device token
// POST /api/devices/unregister
// body: { user_id, device_token }
router.post('/unregister', authenticateToken, async (req, res) => {
  const { user_id, device_token } = req.body;
  if (!user_id || !device_token) return res.status(400).json({ success: false, error: 'Missing user_id or device_token' });
  try {
    await query('DELETE FROM devices WHERE user_id = $1 AND device_token = $2', [user_id, device_token]);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error unregistering device:', err?.message || err);
    res.status(500).json({ success: false, error: err?.message || 'error' });
  }
});

module.exports = router;

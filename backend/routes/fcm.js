const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/fcm/token
 * Save or update FCM token for the authenticated user
 */
router.post('/token', authenticateToken, async (req, res) => {
  try {
    const { fcm_token } = req.body;
    const userId = req.user.id;

    if (!fcm_token) {
      return res.status(400).json({ error: 'FCM token is required' });
    }

    // Update user's FCM token
    await db.query(
      'UPDATE users SET fcm_token = $1, updated_at = NOW() WHERE id = $2',
      [fcm_token, userId]
    );

    console.log(`✅ FCM token saved for user ${userId}`);
    res.json({ 
      success: true, 
      message: 'FCM token saved successfully' 
    });
  } catch (error) {
    console.error('❌ Error saving FCM token:', error);
    res.status(500).json({ error: 'Failed to save FCM token' });
  }
});

/**
 * DELETE /api/fcm/token
 * Remove FCM token (user logout or app uninstall)
 */
router.delete('/token', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await db.query(
      'UPDATE users SET fcm_token = NULL, updated_at = NOW() WHERE id = $1',
      [userId]
    );

    console.log(`✅ FCM token removed for user ${userId}`);
    res.json({ 
      success: true, 
      message: 'FCM token removed successfully' 
    });
  } catch (error) {
    console.error('❌ Error removing FCM token:', error);
    res.status(500).json({ error: 'Failed to remove FCM token' });
  }
});

module.exports = router;

const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { sendGenericNotification } = require('../utils/fcm');

const router = express.Router();

// 1. POST /messages/send
router.post('/send', authenticateToken, async (req, res) => {
  const { sender_id, receiver_id, content } = req.body;
  if (!sender_id || !receiver_id || !content) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  try {
    // Insert message
    const result = await query(
      'INSERT INTO messages (sender_id, receiver_id, content, created_at, is_read) VALUES ($1, $2, $3, NOW(), false) RETURNING *',
      [sender_id, receiver_id, content]
    );
    const message = result.rows[0];
    // Trigger FCM push to receiver
    await sendGenericNotification(receiver_id, {
      title: `New message from ${sender_id}`,
      message: content,
      type: 'message',
      message_id: message.id,
      sender_id,
      receiver_id,
      data: { message_id: message.id, sender_id, receiver_id }
    });
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. GET /messages/inbox?user_id=:id
router.get('/inbox', authenticateToken, async (req, res) => {
  const user_id = req.query.user_id;
  if (!user_id) return res.status(400).json({ success: false, error: 'Missing user_id' });
  try {
    // Get threads (distinct users, last message)
    const result = await query(`
      SELECT DISTINCT ON (other_user) other_user, m.* FROM (
        SELECT CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS other_user, *
        FROM messages WHERE sender_id = $1 OR receiver_id = $1
      ) m
      ORDER BY other_user, created_at DESC
    `, [user_id]);
    res.json({ success: true, threads: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. GET /messages/thread?user1=:id1&user2=:id2
router.get('/thread', authenticateToken, async (req, res) => {
  const { user1, user2 } = req.query;
  if (!user1 || !user2) return res.status(400).json({ success: false, error: 'Missing user1 or user2 query params' });
  try {
    const result = await query(
      'SELECT id, sender_id, receiver_id, content, is_read, created_at as timestamp FROM messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY created_at ASC',
      [user1, user2]
    );
    res.json({ success: true, messages: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. POST /messages/read
router.post('/read', authenticateToken, async (req, res) => {
  const { message_id } = req.body;
  if (!message_id) return res.status(400).json({ success: false, error: 'Missing message_id' });
  try {
    await query('UPDATE messages SET is_read = true WHERE id = $1', [message_id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

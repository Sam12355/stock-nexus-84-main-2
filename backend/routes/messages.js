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
    // Insert message and return with sender info
    const result = await query(
      `INSERT INTO messages (sender_id, receiver_id, content, created_at, is_read) 
       VALUES ($1, $2, $3, NOW(), false) 
       RETURNING id, sender_id, receiver_id, content, is_read, created_at as timestamp`,
      [sender_id, receiver_id, content]
    );
    const message = result.rows[0];
    
    // Get sender name for FCM
    const senderResult = await query('SELECT name FROM users WHERE id = $1', [sender_id]);
    const senderName = senderResult.rows[0]?.name || 'Someone';
    
    // Trigger FCM push to receiver with sender name
    await sendGenericNotification(receiver_id, {
      title: `New message from ${senderName}`,
      message: content,
      type: 'message',
      message_id: message.id,
      sender_id,
      receiver_id,
      data: { message_id: message.id, sender_id, receiver_id, sender_name: senderName }
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
    // Get threads with user info (distinct users, last message, include user name and photo)
    const result = await query(`
      SELECT DISTINCT ON (other_user_id) 
        other_user_id,
        u.name as other_user_name,
        u.photo_url as other_user_photo,
        u.role as other_user_role,
        m.id,
        m.sender_id,
        m.receiver_id,
        m.content,
        m.is_read,
        m.created_at
      FROM (
        SELECT 
          CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS other_user_id,
          *
        FROM messages 
        WHERE sender_id = $1 OR receiver_id = $1
      ) m
      LEFT JOIN users u ON u.id = m.other_user_id
      ORDER BY other_user_id, created_at DESC
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
      `SELECT 
        m.id, 
        m.sender_id, 
        m.receiver_id, 
        m.content, 
        m.is_read, 
        m.created_at as timestamp,
        sender.name as sender_name,
        sender.photo_url as sender_photo,
        receiver.name as receiver_name,
        receiver.photo_url as receiver_photo
      FROM messages m
      LEFT JOIN users sender ON sender.id = m.sender_id
      LEFT JOIN users receiver ON receiver.id = m.receiver_id
      WHERE (m.sender_id = $1 AND m.receiver_id = $2) OR (m.sender_id = $2 AND m.receiver_id = $1) 
      ORDER BY m.created_at ASC`,
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

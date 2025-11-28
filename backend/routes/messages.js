const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { sendGenericNotification } = require('../utils/fcm');

const router = express.Router();

// GET /api/messages - Fetch all messages for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        m.id,
        m.sender_id,
        m.receiver_id,
        m.content,
        m.created_at,
        m.is_read,
        m.thread_id,
        sender.name as sender_name,
        sender.photo_url as sender_photo,
        receiver.name as receiver_name,
        receiver.photo_url as receiver_photo
      FROM messages m
      LEFT JOIN users sender ON sender.id = m.sender_id
      LEFT JOIN users receiver ON receiver.id = m.receiver_id
      WHERE m.sender_id = $1 OR m.receiver_id = $1
      ORDER BY m.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, messages: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/threads - Fetch all message threads for authenticated user
router.get('/threads', authenticateToken, async (req, res) => {
  try {
    // Group messages into threads with user info
    const result = await query(
      `SELECT DISTINCT ON (other_user_id)
        other_user_id as id,
        $1 as user1_id,
        other_user_id as user2_id,
        m.id as last_message_id,
        m.content as last_message_content,
        m.created_at as updated_at,
        m.created_at,
        u.name as other_user_name,
        u.photo_url as other_user_photo,
        u.role as other_user_role
      FROM (
        SELECT 
          CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS other_user_id,
          *
        FROM messages
        WHERE sender_id = $1 OR receiver_id = $1
      ) m
      LEFT JOIN users u ON u.id = m.other_user_id
      ORDER BY other_user_id, created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, threads: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 1. POST /messages/send
router.post('/send', authenticateToken, async (req, res) => {
  const { sender_id, receiver_id, content } = req.body;
  if (!sender_id || !receiver_id || !content) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  try {
    // Check if receiver is online via Socket.IO
    const app = require('../server');
    const io = app.get('io');
    let isReceiverOnline = false;
    
    if (io) {
      const receiverSockets = io.sockets.adapter.rooms.get(receiver_id);
      isReceiverOnline = receiverSockets && receiverSockets.size > 0;
    }
    
    // Insert message - handle both old and new schema
    let result;
    try {
      // Try new schema with delivered_at and read_at
      const deliveredValue = isReceiverOnline ? 'NOW()' : 'NULL';
      result = await query(
        `INSERT INTO messages (sender_id, receiver_id, content, created_at, is_read, delivered_at, read_at) 
         VALUES ($1, $2, $3, NOW(), false, ${deliveredValue}, NULL) 
         RETURNING id, sender_id, receiver_id, content, is_read, created_at as timestamp, delivered_at, read_at`,
        [sender_id, receiver_id, content]
      );
    } catch (insertError) {
      // Fallback to old schema if new columns don't exist
      result = await query(
        `INSERT INTO messages (sender_id, receiver_id, content, created_at, is_read) 
         VALUES ($1, $2, $3, NOW(), false) 
         RETURNING id, sender_id, receiver_id, content, is_read, created_at as timestamp`,
        [sender_id, receiver_id, content]
      );
    }
    const message = result.rows[0];
    
    // Check if receiver currently has this conversation open (instant read receipt)
    const activeConversations = app.get('activeConversations');
    // First check activeConversations map
    let receiverHasChatOpen = activeConversations && activeConversations.get(receiver_id) === sender_id;

    // Also check the deterministic conversation room (conv:<idA>:<idB>) — more race-resistant
    try {
      const io = app.get('io');
      if (io && !receiverHasChatOpen) {
        const roomName = `conv:${[String(sender_id), String(receiver_id)].sort().join(':')}`;
        const convRoom = io.sockets.adapter.rooms.get(roomName);
        const receiverSockets = io.sockets.adapter.rooms.get(String(receiver_id));
        if (convRoom && receiverSockets) {
          for (const sid of convRoom) {
            if (receiverSockets.has(sid)) {
              receiverHasChatOpen = true;
              break;
            }
          }
        }
      }
    } catch (err) {
      console.log('⚠️ Could not check conversation room presence:', err?.message || err);
    }
    
    if (receiverHasChatOpen) {
      // Receiver is viewing this chat — do a single atomic update so all affected rows
      // receive the same read_at timestamp and we can emit a consistent messagesRead event.
      try {
        const updated = await query(
          `WITH updated AS (
             UPDATE messages
             SET is_read = true, read_at = NOW()
             WHERE id = $1 OR (receiver_id = $2 AND sender_id = $3 AND read_at IS NULL)
             RETURNING id, read_at
           ) SELECT id, read_at FROM updated`,
          [message.id, receiver_id, sender_id]
        );

        if (updated.rows.length > 0) {
          const readIds = updated.rows.map(r => r.id);
          const readAt = updated.rows[0].read_at || new Date().toISOString();

          // set the message object's read_at consistently
          message.read_at = readAt;

          // Inform the sender that these messages were read
          try {
            const io = app.get('io');
            if (io) {
              io.to(sender_id).emit('messagesRead', {
                messageIds: readIds,
                readAt,
                readBy: receiver_id
              });
            }
          } catch (emitErr) {
            console.error('❌ Error emitting messagesRead after atomic update:', emitErr?.message || emitErr);
          }

          console.log(`✅ Atomically marked ${readIds.length} messages as read (read_at=${readAt}) for conversation ${sender_id} -> ${receiver_id}`);
        }
      } catch (readErr) {
        // If read_at doesn't exist on the DB (older schema), fall back to marking is_read
        console.warn('⚠️ Atomic read_at update failed, falling back (maybe read_at column missing):', readErr?.message || readErr);
        try {
          // Mark the current message as read
          await query('UPDATE messages SET is_read = true WHERE id = $1 RETURNING id', [message.id]);
          // Mark other previous unread messages as read (non-atomic but survives older schemas)
          const prev = await query(
            'UPDATE messages SET is_read = true WHERE receiver_id = $1 AND sender_id = $2 AND is_read = false RETURNING id',
            [receiver_id, sender_id]
          );
          const readIds = [message.id].concat(prev.rows.map(r => r.id));
          const readAt = new Date().toISOString();
          message.read_at = readAt; // best-effort (not stored)
          const io = app.get('io');
          if (io && readIds.length > 0) {
            io.to(sender_id).emit('messagesRead', { messageIds: readIds, readAt, readBy: receiver_id });
          }
          console.log(`✅ Fallback: marked ${readIds.length} messages as read for conversation ${sender_id} -> ${receiver_id}`);
        } catch (fallbackErr) {
          console.error('❌ Could not auto-mark messages as read (fallback):', fallbackErr?.message || fallbackErr);
        }
      }
    }
    
    // Get sender info for FCM (name and photo)
    const senderResult = await query('SELECT name, photo_url FROM users WHERE id = $1', [sender_id]);
    const sender = senderResult.rows[0] || {};
    const senderName = sender.name || 'Someone';
    const senderPhoto = sender.photo_url || '';

    // Device-scoped FCM: query device tokens for the receiver and exclude sender's device token(s).
    try {
      const deviceRows = await query('SELECT device_token FROM devices WHERE user_id = $1 AND device_token IS NOT NULL', [receiver_id]);
      const receiverTokens = deviceRows.rows.map(r => r.device_token).filter(Boolean);

      // Determine sender device token(s) to exclude — client can pass `sender_device_token` or `sender_device_tokens` in the request body
      const senderExcludeTokens = new Set();
      if (req.body.sender_device_token) senderExcludeTokens.add(String(req.body.sender_device_token));
      if (Array.isArray(req.body.sender_device_tokens)) req.body.sender_device_tokens.forEach(t => senderExcludeTokens.add(String(t)));

      // Filter out any tokens that match sender's devices
      const tokensToSend = receiverTokens.filter(t => !senderExcludeTokens.has(String(t)));

      if (tokensToSend.length > 0 && !isReceiverOnline && receiver_id !== sender_id) {
        try {
          const admin = require('../config/firebase');
          const messagePayload = {
            tokens: tokensToSend,
            data: {
              type: 'new_message',
              sender_id: String(sender_id),
              sender_name: String(senderName),
              sender_photo: String(senderPhoto),
              content: String(content),
              message_id: String(message.id),
              id: String(message.id)
            },
            android: { priority: 'high' }
          };

          // Use sendMulticast to deliver to multiple device tokens at once
          const response = await admin.messaging().sendMulticast({
            tokens: tokensToSend,
            data: messagePayload.data,
            android: { priority: 'high' }
          });
          console.log(`✅ FCM new_message multicast sent to ${tokensToSend.length} device(s) for user ${receiver_id}`, response.successCount + ' successes');
        } catch (fcmError) {
          console.error(`❌ FCM multicast error for user ${receiver_id}:`, fcmError?.message || fcmError);
        }
      } else if (isReceiverOnline) {
        console.log(`⏩ Skipping FCM - receiver ${receiver_id} is online via Socket.IO`);
      } else if (receiver_id === sender_id) {
        console.log(`⏩ Skipping FCM - message sent to self (sender=${sender_id}, receiver=${receiver_id})`);
      } else {
        console.log(`⚠️ No device tokens to send FCM for receiver: ${receiver_id}`);
      }
    } catch (deviceErr) {
      console.error('❌ Error fetching device tokens for receiver:', deviceErr?.message || deviceErr);
    }
    
    // Emit Socket.IO event for real-time delivery
    try {
      if (io) {
        io.to(receiver_id).emit('new_message', {
          sender_id,
          sender_name: senderName,
          sender_photo: senderPhoto,
          content,
          message_id: message.id,
          id: message.id,
          timestamp: message.timestamp,
          delivered_at: message.delivered_at,
          read_at: message.read_at,
          sent_at: message.timestamp
        });
        console.log(`📡 Socket.IO new_message event sent to ${receiver_id}`);
        
        // Also emit to sender so they see their own message with correct read status
        io.to(sender_id).emit('new_message', {
          sender_id,
          sender_name: senderName,
          sender_photo: senderPhoto,
          content,
          message_id: message.id,
          id: message.id,
          timestamp: message.timestamp,
          delivered_at: message.delivered_at,
          read_at: message.read_at,
          sent_at: message.timestamp
        });
        
        // If receiver is online, emit messageDelivered to both users
        if (isReceiverOnline && message.delivered_at) {
          const deliveredEvent = {
            messageId: message.id,
            deliveredAt: message.delivered_at
          };
          io.to(sender_id).emit('messageDelivered', deliveredEvent);
          io.to(receiver_id).emit('messageDelivered', deliveredEvent);
          console.log(`✅ Message ${message.id} delivered immediately (receiver online)`);
        }
      }
    } catch (socketError) {
      console.error('❌ Socket.IO error:', socketError.message);
    }
    
    res.json({ success: true, message });
  } catch (error) {
    console.error('❌ Error sending message:', error);
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
    let result;
    try {
      // Try with read_at column if it exists
      result = await query(
        'UPDATE messages SET is_read = true, read_at = NOW() WHERE id = $1 RETURNING id, sender_id, read_at', 
        [message_id]
      );
    } catch (updateError) {
      // Fallback to old schema
      result = await query(
        'UPDATE messages SET is_read = true WHERE id = $1 RETURNING id, sender_id', 
        [message_id]
      );
    }
    
    if (result.rows.length > 0) {
      const msg = result.rows[0];
      
      // Emit to sender via Socket.IO
      try {
        const app = require('../server');
        const io = app.get('io');
        if (io) {
          io.to(msg.sender_id).emit('messagesRead', {
            messageIds: [msg.id],
            readAt: msg.read_at || new Date().toISOString(),
            readBy: req.user.id
          });
        }
      } catch (socketError) {
        console.error('❌ Socket.IO error:', socketError);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const presence = require('./utils/presence');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const itemRoutes = require('./routes/items');
const reportRoutes = require('./routes/reports');
const analyticsRoutes = require('./routes/analytics');
const locationRoutes = require('./routes/locations');
const stockRoutes = require('./routes/stock');
const moveoutRoutes = require('./routes/moveout');
const notificationRoutes = require('./routes/notifications');
const activityLogRoutes = require('./routes/activity-logs');
const calendarEventRoutes = require('./routes/calendar-events');
const scheduledNotificationRoutes = require('./routes/scheduled-notifications');
const branchAssignmentRoutes = require('./routes/branch-assignments');
const setupRoutes = require('./routes/setup');
const receiptRoutes = require('./routes/receipts');
const moveoutListRoutes = require('./routes/moveout-lists');
const softdrinkTrendsRoutes = require('./routes/softdrink-trends');
const debugRoutes = require('./routes/debug');
const weatherRoutes = require('./routes/weather'); // Weather API routes
const icaDeliveryRoutes = require('./routes/ica-delivery');
const fcmRoutes = require('./routes/fcm'); // FCM push notifications
const presenceRoutes = require('./routes/presence');
const messagesRoutes = require('./routes/messages');
const devicesRoutes = require('./routes/devices');
const schedulerService = require('./services/scheduler');
const emailService = require('./services/email');

// Initialize Firebase Admin SDK
require('./config/firebase');

const path = require('path');
const fs = require('fs');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',  // Allow all origins for mobile app support
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  // Allow mobile clients to connect
  allowEIO3: true,
  transports: ['websocket', 'polling']
});

// Initialize presence subsystem (Redis or in-memory)
presence.init().catch(err => console.warn('Presence init error:', err?.message || err));

// NOTE: Presence events (user-online, user-offline, online-members) are handled directly
// in the io.on('connection') handler to properly exclude the sender using socket.to()
// The presence module's EventEmitter is only used for Redis cross-instance pub/sub

const PORT = process.env.PORT || 5000;

// Trust proxy for rate limiting (required for Render)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit for development
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration - support multiple domains
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:8081',
  'https://stock-nexus-84-main-2-kmth.vercel.app',
  'https://ims-sy.vercel.app'
].filter(Boolean); // Remove any undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files - use absolute path to ensure it works on Render
const uploadsPath = path.join(__dirname, 'uploads');

console.log('📁 Uploads path:', uploadsPath);

// Serve uploads directory with permissive CORS for all files including receipts
app.use('/uploads', (req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
}, express.static(uploadsPath));

// Serve receipt images with CORS and error handling.
// This allows mobile apps to load images via: /api/files/receipts/:filename
app.options('/api/files/receipts/:filename', (req, res) => {
  // Allow preflight from any origin for this endpoint
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  return res.sendStatus(204);
});

app.get('/api/files/receipts/:filename', (req, res) => {
  try {
    // Sanitize filename to prevent path traversal
    const filename = path.basename(req.params.filename);
    const receiptsDir = path.resolve(__dirname, 'uploads', 'receipts');
    const filePath = path.join(receiptsDir, filename);

    // Set permissive CORS headers so Android apps can fetch images
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    // Check file existence
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Use sendFile to stream the file to the client
    return res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending receipt file:', err);
        if (!res.headersSent) {
          return res.status(500).json({ error: 'Error serving file' });
        }
      }
    });
  } catch (err) {
    console.error('Unexpected error serving receipt file:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Socket.IO status debug endpoint
app.get('/api/socket-status', async (req, res) => {
  try {
    const sockets = await io.fetchSockets();
    const allOnline = await presence.getAllOnline();
    res.json({
      status: 'ok',
      connectedSockets: sockets.length,
      socketIds: sockets.map(s => ({ id: s.id, userId: s.user?.id, name: s.user?.name })),
      onlineByBranch: allOnline,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.json({
      status: 'ok',
      error: e?.message || 'Could not fetch socket details',
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint to check receipts directory
app.get('/api/debug/receipts', (req, res) => {
  const receiptsDir = path.join(__dirname, 'uploads', 'receipts');
  try {
    const exists = fs.existsSync(receiptsDir);
    let files = [];
    if (exists) {
      files = fs.readdirSync(receiptsDir);
    }
    res.json({
      receiptsPath: receiptsDir,
      exists,
      fileCount: files.length,
      files: files.slice(0, 20), // Show first 20 files
      __dirname,
      cwd: process.cwd()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      receiptsPath: receiptsDir,
      __dirname,
      cwd: process.cwd()
    });
  }
});

// Email service status endpoint
app.get('/api/email-status', (req, res) => {
  try {
    const status = emailService.getStatus();
    res.json({
      success: true,
      emailService: status,
      environment: {
        EMAIL_HOST: process.env.EMAIL_HOST || 'Not set',
        EMAIL_PORT: process.env.EMAIL_PORT || 'Not set',
        EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Not set',
        EMAIL_PASS: process.env.EMAIL_PASS ? 'Set' : 'Not set'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api', locationRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/moveout', moveoutRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/calendar-events', calendarEventRoutes);
app.use('/api/scheduled-notifications', scheduledNotificationRoutes);
app.use('/api/branch-assignments', branchAssignmentRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/moveout-lists', moveoutListRoutes);
app.use('/api/softdrink-trends', softdrinkTrendsRoutes);
app.use('/api/ica-delivery', icaDeliveryRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/fcm', fcmRoutes);
app.use('/api/presence', presenceRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/devices', devicesRoutes);

// Health check endpoint for Render
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Basic test endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Stock Nexus Backend API',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Authenticate sockets using JWT in handshake (require token in socket.auth)
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || (socket.handshake.headers && socket.handshake.headers.authorization && socket.handshake.headers.authorization.split(' ')[1]);
    if (!token) return next(new Error('Authentication error - token required'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Fetch user record to confirm active + get branch
    const { query } = require('./config/database');
    const result = await query('SELECT id, name, email, role, branch_id, branch_context, photo_url FROM users WHERE id = $1', [decoded.userId]);
    if (result.rows.length === 0) return next(new Error('Authentication error - user not found'));

    const user = result.rows[0];
    if (!user) return next(new Error('Authentication error - invalid user'));
    socket.user = user;
    return next();
  } catch (err) {
    console.error('Socket auth failed:', err?.message || err);
    return next(new Error('Authentication error'));
  }
});

// Helper function to broadcast all online users to admins
async function broadcastToAdmins(io) {
  try {
    const allOnline = await presence.getAllOnline();
    // Flatten all branches into single array (deduplicate by id)
    const seenIds = new Set();
    const members = [];
    for (const branchMembers of Object.values(allOnline)) {
      for (const member of branchMembers) {
        if (!seenIds.has(member.id)) {
          seenIds.add(member.id);
          members.push(member);
        }
      }
    }
    io.to('admins-overview').emit('online-members', members);
    console.log(`📤 Broadcast ${members.length} total online users to admins-overview room`);
  } catch (e) {
    console.error('Error broadcasting to admins:', e?.message || e);
  }
}

// Track which users are currently viewing which conversations
// Key: userId, Value: conversationPartnerId they're viewing
const activeConversations = new Map();
app.set('activeConversations', activeConversations);

// Socket.IO connection handling
io.on('connection', async (socket) => {
  console.log('\n========== SOCKET CONNECTION ==========');
  console.log('🔌 Client connected (authenticated):', socket.id);
  console.log('👤 User ID:', socket.user?.id);
  console.log('👤 User Name:', socket.user?.name);
  console.log('🏢 User branch_id:', socket.user?.branch_id);
  console.log('🏢 User branch_context:', socket.user?.branch_context);

  // Determine primary branch for this user
  const branchId = socket.user?.branch_context || socket.user?.branch_id;
  console.log('🎯 Using branchId:', branchId);

  // Join user's personal room for direct messaging (e.g., typing indicators, DMs)
  socket.join(socket.user.id);
  console.log(`✅ User ${socket.user.name} joined personal room: ${socket.user.id}`);

  // Auto-join branch room
  if (branchId) {
    const room = `branch-${branchId}`;
    socket.join(room);
    
    // Log room membership
    const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
    console.log(`✅ User ${socket.user.name} joined room: ${room}`);
    console.log(`📊 Room ${room} now has ${roomSize} socket(s)`);
    
    // Add presence and emit user-online to OTHER users in the branch
    try {
      const result = await presence.addSocket({ 
        branchId, 
        userId: socket.user.id, 
        socketId: socket.id, 
        meta: { 
          name: socket.user.name, 
          photoUrl: socket.user.photo_url, 
          role: socket.user.role 
        } 
      });
      
      console.log('📦 Presence result:', JSON.stringify({ firstConnection: result?.firstConnection, memberCount: result?.members?.length }));
      
      // ALWAYS send online members to the connecting user first
      if (result && result.members) {
        const membersForConnectingUser = result.members.filter(m => m.id !== socket.user.id);
        socket.emit('online-members', membersForConnectingUser);
        console.log(`📤 Sent ${membersForConnectingUser.length} members to connecting user ${socket.user.name} (excluding self)`);
      }
      
      // If this is user's first connection (not a reconnect with existing tabs)
      if (result && result.firstConnection) {
        // Emit user-online to OTHER users in the branch (not to the connecting user)
        const userOnlinePayload = {
          id: socket.user.id,
          userId: socket.user.id,
          name: socket.user.name,
          photoUrl: socket.user.photo_url || null
        };
        socket.to(room).emit('user-online', userOnlinePayload);
        console.log(`📤 Emitted 'user-online' to OTHER users in ${room}:`, JSON.stringify(userOnlinePayload));
        console.log(`👤 User ${socket.user.name} (${socket.user.id}) is now ONLINE in branch ${branchId}`);
        
        // Also notify admins about this user coming online
        io.to('admins-overview').emit('user-online', userOnlinePayload);
        console.log(`📤 Emitted 'user-online' to admins-overview room`);
        
        // Send personalized online-members to OTHER users in the branch (excluding new user)
        if (result.members) {
          console.log(`📤 Broadcasting 'online-members' to OTHER users in ${room}`);
          
          // Get all sockets in this branch room (excluding the connecting socket)
          const socketsInRoom = await io.in(room).fetchSockets();
          for (const recipientSocket of socketsInRoom) {
            if (recipientSocket.id !== socket.id) { // Skip the connecting user
              // Filter out the recipient from the members list
              const membersForRecipient = result.members.filter(m => m.id !== recipientSocket.user?.id);
              recipientSocket.emit('online-members', membersForRecipient);
              console.log(`📤 Sent ${membersForRecipient.length} members to ${recipientSocket.user?.name} (excluding self)`);
            }
          }
          
          // Also broadcast updated all-online to admins
          broadcastToAdmins(io);
        }
      }
    } catch (e) {
      console.error('❌ Error adding socket to presence:', e?.message || e);
    }
  } else {
    console.log('⚠️ No branchId found for user - not joining any room!');
  }
  console.log('========================================\n');

  // Admins can subscribe to admin-overview room to get cross-branch presence
  if (socket.user && socket.user.role === 'admin') {
    socket.join('admins-overview');
  }

  // If client explicitly asks to join other branch (admin or allowed user), handle securely
  socket.on('join-branch', async (requestedBranchId, ack) => {
    console.log('\n========== JOIN-BRANCH EVENT ==========');
    console.log('🔌 Socket:', socket.id);
    console.log('👤 User:', socket.user?.name, '(', socket.user?.id, ')');
    console.log('🎯 Requested branchId:', requestedBranchId);
    console.log('🏢 User branch_id:', socket.user?.branch_id);
    console.log('🏢 User branch_context:', socket.user?.branch_context);
    console.log('👔 User role:', socket.user?.role);
    
    try {
      // Special handling for admin users requesting 'admin' room
      if (requestedBranchId === 'admin' && socket.user.role === 'admin') {
        console.log('👑 Admin user joining admin room - will see ALL online users');
        const room = 'branch-admin';
        socket.join(room);
        
        // For admins, get ALL online users from ALL branches
        const allOnline = await presence.getAllOnline();
        const allMembers = [];
        for (const branchId in allOnline) {
          allMembers.push(...allOnline[branchId]);
        }
        
        // Deduplicate by user ID (in case user is in multiple branches)
        const uniqueMembers = [];
        const seenIds = new Set();
        for (const member of allMembers) {
          if (!seenIds.has(member.id)) {
            seenIds.add(member.id);
            uniqueMembers.push(member);
          }
        }
        
        console.log(`📤 Sending ${uniqueMembers.length} total online members to admin`);
        socket.emit('online-members', uniqueMembers);
        
        console.log('========================================\n');
        if (typeof ack === 'function') ack({ success: true, members: uniqueMembers });
        return;
      }
      
      // authorization: admins can join anywhere, others only their own branch
      if (socket.user.role !== 'admin' && (requestedBranchId !== socket.user.branch_id && requestedBranchId !== socket.user.branch_context)) {
        console.log('❌ NOT AUTHORIZED for branch', requestedBranchId);
        if (typeof ack === 'function') ack({ success: false, error: 'Not authorized for branch' });
        return;
      }
      const room = `branch-${requestedBranchId}`;
      socket.join(room);
      
      // Log room membership
      const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
      console.log(`✅ User ${socket.user.name} joined room: ${room}`);
      console.log(`📊 Room ${room} now has ${roomSize} socket(s)`);
      
      // add presence for requested branch
      const result = await presence.addSocket({ 
        branchId: requestedBranchId, 
        userId: socket.user.id, 
        socketId: socket.id, 
        meta: { 
          name: socket.user.name, 
          photoUrl: socket.user.photo_url, 
          role: socket.user.role 
        } 
      });
      
      console.log('📦 Presence result:', JSON.stringify({ firstConnection: result?.firstConnection, memberCount: result?.members?.length }));
      
      // Emit user-online to OTHER users in the branch
      if (result && result.firstConnection) {
        const userOnlinePayload = {
          id: socket.user.id,
          userId: socket.user.id,
          name: socket.user.name,
          photoUrl: socket.user.photo_url || null
        };
        socket.to(room).emit('user-online', userOnlinePayload);
        console.log(`📤 Emitted 'user-online' to OTHER users in ${room}:`, JSON.stringify(userOnlinePayload));
        console.log(`👤 User ${socket.user.name} joined branch ${requestedBranchId} - now ONLINE`);
        
        // Send personalized online-members to each user in the branch
        if (result.members) {
          console.log(`📤 Broadcasting 'online-members' to room ${room}:`, JSON.stringify(result.members));
          
          // Get all sockets in this branch room
          const socketsInRoom = await io.in(room).fetchSockets();
          for (const recipientSocket of socketsInRoom) {
            // Filter out the recipient from the members list
            const membersForRecipient = result.members.filter(m => m.id !== recipientSocket.user?.id);
            recipientSocket.emit('online-members', membersForRecipient);
          }
          console.log(`✅ Broadcast personalized members to ${socketsInRoom.length} users in branch ${requestedBranchId}`);
        }
      } else if (result && result.members) {
        // Already online - just send to this socket (excluding self)
        const membersForUser = result.members.filter(m => m.id !== socket.user.id);
        console.log(`📤 Sending 'online-members' to ONLY ${socket.user.name} (already online):`, JSON.stringify(membersForUser));
        socket.emit('online-members', membersForUser);
      }
      
      console.log('========================================\n');
      if (typeof ack === 'function') ack({ success: true, members: result?.members || [] });
    } catch (err) {
      console.error('join-branch error:', err?.message || err);
      if (typeof ack === 'function') ack({ success: false, error: err?.message || 'error' });
    }
  });

  socket.on('disconnect', async (reason) => {
    console.log('\n========== SOCKET DISCONNECT ==========');
    console.log('🔌 Socket disconnected:', socket.id);
    console.log('👤 User:', socket.user?.name, '(', socket.user?.id, ')');
    console.log('📝 Reason:', reason);
    
    // Clean up active conversation tracking
    if (socket.user?.id) {
      activeConversations.delete(socket.user.id);
    }
    
    try {
      // Get branch before removing socket
      const userBranchId = socket.user?.branch_context || socket.user?.branch_id;
      console.log('🏢 User branchId:', userBranchId);
      
      // Remove presence mapping
      const result = await presence.removeSocket(socket.id);
      console.log('📦 Presence removal result:', JSON.stringify({ wentOffline: result?.wentOffline, memberCount: result?.members?.length }));
      
      // If user went offline (no more connections), notify other users
      if (result && result.wentOffline && userBranchId) {
        const room = `branch-${userBranchId}`;
        const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
        console.log(`📊 Room ${room} now has ${roomSize} socket(s) remaining`);
        
        console.log(`📤 Emitting 'user-offline' to room ${room}:`, socket.user.id);
        io.to(room).emit('user-offline', socket.user.id);
        console.log(`👤 User ${socket.user.name} (${socket.user.id}) went OFFLINE from branch ${userBranchId}`);
        
        // Also notify admins about this user going offline
        io.to('admins-overview').emit('user-offline', socket.user.id);
        console.log(`📤 Emitted 'user-offline' to admins-overview room`);
        
        // Send personalized updated members list to remaining users
        if (result.members) {
          console.log(`📤 Broadcasting 'online-members' to room ${room}:`, JSON.stringify(result.members));
          
          // Get all remaining sockets in this branch room
          const socketsInRoom = await io.in(room).fetchSockets();
          for (const recipientSocket of socketsInRoom) {
            // Filter out the recipient from the members list
            const membersForRecipient = result.members.filter(m => m.id !== recipientSocket.user?.id);
            recipientSocket.emit('online-members', membersForRecipient);
          }
          console.log(`✅ Broadcast personalized members to ${socketsInRoom.length} remaining users`);
          
          // Also broadcast updated all-online to admins
          broadcastToAdmins(io);
        }
      } else {
        console.log('ℹ️ User still has other connections or no branchId - not broadcasting offline');
      }
      console.log('========================================\n');
    } catch (e) {
      console.error('❌ Error removing socket presence:', e?.message || e);
      console.log('========================================\n');
    }
  });

  // Ping-pong for connection testing
  socket.on('ping', (callback) => {
    if (typeof callback === 'function') {
      callback({ status: 'ok', timestamp: Date.now() });
    } else {
      socket.emit('pong', { status: 'ok', timestamp: Date.now() });
    }
  });

  // Get current online members on demand
  socket.on('get-online-members', async (callback) => {
    console.log('\n========== GET ONLINE MEMBERS ==========');
    console.log('👤 Requested by:', socket.user?.name, '(', socket.user?.id, ')');
    
    try {
      const userBranchId = socket.user?.branch_context || socket.user?.branch_id;
      const isAdmin = socket.user?.role === 'admin';
      
      console.log('🏢 User branch:', userBranchId);
      console.log('👔 Is admin:', isAdmin);
      
      let members = [];
      
      if (isAdmin) {
        // Admin gets ALL online users from ALL branches
        const allOnline = await presence.getAllOnline();
        // Flatten all branches into single array (deduplicate by id)
        const seenIds = new Set();
        for (const branchMembers of Object.values(allOnline)) {
          for (const member of branchMembers) {
            if (!seenIds.has(member.id)) {
              seenIds.add(member.id);
              members.push(member);
            }
          }
        }
        console.log(`📊 Admin requested online members: ${members.length} users from all branches`);
      } else if (userBranchId) {
        members = await presence.getMembers(userBranchId);
        console.log(`📊 Retrieved ${members.length} online members from branch ${userBranchId}`);
        console.log(`📋 Members list:`, JSON.stringify(members.map(m => ({ id: m.id, name: m.name }))));
      } else {
        console.log('⚠️ No branch ID found for user - returning empty list');
      }
      
      // Filter out the current user from their own list
      const membersForUser = members.filter(m => m.id !== socket.user?.id);
      console.log(`✅ Sending ${membersForUser.length} members to ${socket.user?.name} (excluding self)`);
      
      if (typeof callback === 'function') {
        callback({ success: true, members: membersForUser });
      } else {
        socket.emit('online-members', membersForUser);
      }
      console.log('=========================================\n');
    } catch (e) {
      console.error('❌ get-online-members error:', e?.message || e);
      console.log('=========================================\n');
      if (typeof callback === 'function') {
        callback({ success: false, error: e?.message || 'error' });
      }
    }
  });

  // Handle user going away (app minimized / browser tab unfocused)
  socket.on('user-away', async () => {
    console.log('\n========== USER AWAY ==========');
    console.log('😴 User went away:', socket.user?.name, '(', socket.user?.id, ')');
    
    try {
      const userBranchId = socket.user?.branch_context || socket.user?.branch_id;
      if (!userBranchId || !socket.user?.id) {
        console.log('❌ No branchId or userId - ignoring away event');
        console.log('===============================\n');
        return;
      }

      const room = `branch-${userBranchId}`;
      console.log('🏢 Branch:', userBranchId);

      // Mark user as away in presence system
      const result = await presence.setUserAway(socket.user.id, userBranchId, true);
      
      // Send personalized online members (excluding away users) to each user
      if (result && result.members) {
        console.log(`📤 Broadcasting 'online-members' to room ${room} (excluding away):`, JSON.stringify(result.members));
        
        // Get all sockets in this branch room
        const socketsInRoom = await io.in(room).fetchSockets();
        for (const recipientSocket of socketsInRoom) {
          // Filter out the recipient from the members list
          const membersForRecipient = result.members.filter(m => m.id !== recipientSocket.user?.id);
          recipientSocket.emit('online-members', membersForRecipient);
        }
        console.log(`✅ Broadcast personalized members to ${socketsInRoom.length} active users (${socket.user.name} is now away)`);
        
        // Also broadcast to admins
        broadcastToAdmins(io);
      }
      
      // Also emit user-away event so clients can show "away" status if needed
      socket.to(room).emit('user-away', { userId: socket.user.id, name: socket.user.name });
      io.to('admins-overview').emit('user-away', { userId: socket.user.id, name: socket.user.name });
      
      console.log('===============================\n');
    } catch (e) {
      console.error('❌ Error handling user-away:', e?.message || e);
      console.log('===============================\n');
    }
  });

  // Handle user coming back (app foregrounded / browser tab focused)
  socket.on('user-back', async () => {
    console.log('\n========== USER BACK ==========');
    console.log('👋 User is back:', socket.user?.name, '(', socket.user?.id, ')');
    
    try {
      const userBranchId = socket.user?.branch_context || socket.user?.branch_id;
      if (!userBranchId || !socket.user?.id) {
        console.log('❌ No branchId or userId - ignoring back event');
        console.log('===============================\n');
        return;
      }

      const room = `branch-${userBranchId}`;
      console.log('🏢 Branch:', userBranchId);

      // Mark user as NOT away in presence system
      const result = await presence.setUserAway(socket.user.id, userBranchId, false);
      
      // Send personalized online members (now including this user again) to each user
      if (result && result.members) {
        console.log(`📤 Broadcasting 'online-members' to room ${room} (including returned user):`, JSON.stringify(result.members));
        
        // Get all sockets in this branch room
        const socketsInRoom = await io.in(room).fetchSockets();
        for (const recipientSocket of socketsInRoom) {
          // Filter out the recipient from the members list
          const membersForRecipient = result.members.filter(m => m.id !== recipientSocket.user?.id);
          recipientSocket.emit('online-members', membersForRecipient);
        }
        console.log(`✅ Broadcast personalized members to ${socketsInRoom.length} active users (${socket.user.name} is back)`);
        
        // Also broadcast to admins
        broadcastToAdmins(io);
      }
      
      // Also emit user-back event so clients can update status if needed
      socket.to(room).emit('user-back', { userId: socket.user.id, name: socket.user.name });
      io.to('admins-overview').emit('user-back', { userId: socket.user.id, name: socket.user.name });
      
      console.log('===============================\n');
    } catch (e) {
      console.error('❌ Error handling user-back:', e?.message || e);
      console.log('===============================\n');
    }
  });

  // Handle personal room joining for direct messages
  socket.on('join-room', (userId) => {
    socket.join(userId);
    console.log(`✅ User ${socket.user?.id} joined personal room: ${userId}`);
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const senderId = socket.user?.id; // from socket auth
    const receiverId = data.receiverId;
    
    console.log(`⌨️ ${senderId} typing to ${receiverId}`);
    
    // Send to receiver's personal room
    io.to(receiverId).emit('user_typing', {
      userId: senderId
    });
  });

  // Allow socket to register its device token so server can exclude it from FCM pushes
  socket.on('registerDevice', async (data, ack) => {
    try {
      const device_token = data?.device_token;
      const device_id = data?.device_id;
      socket.data.device_token = device_token || socket.data.device_token;
      socket.data.device_id = device_id || socket.data.device_id;

      // Upsert into devices table so server has canonical device list
      if (device_token) {
        const { query } = require('./config/database');
        if (device_id) {
          await query(
            `INSERT INTO devices (user_id, device_id, device_token, last_seen)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (device_id) DO UPDATE SET device_token = EXCLUDED.device_token, last_seen = NOW()`,
            [socket.user.id, device_id, device_token]
          );
        } else {
          // Insert new row if no device_id provided
          await query(
            `INSERT INTO devices (user_id, device_token, last_seen) VALUES ($1, $2, NOW())`,
            [socket.user.id, device_token]
          );
        }
      }

      if (typeof ack === 'function') ack({ success: true });
    } catch (err) {
      console.error('❌ Error in registerDevice socket handler:', err?.message || err);
      if (typeof ack === 'function') ack({ success: false, error: err?.message || 'error' });
    }
  });

  // Handle stop typing indicators
  socket.on('stop_typing', (data) => {
    const senderId = socket.user?.id;
    const receiverId = data.receiverId;
    
    console.log(`⏸️ ${senderId} stopped typing to ${receiverId}`);
    
    // Send to receiver's personal room
    io.to(receiverId).emit('user_stop_typing', {
      userId: senderId
    });
  });

  // Handle sending messages over Socket.IO (mirrors REST /messages/send behavior)
  socket.on('sendMessage', async (data) => {
    const sender_id = socket.user?.id;
    const { receiver_id, content } = data || {};
    const sender_device_token = data?.sender_device_token;
    const sender_device_tokens = Array.isArray(data?.sender_device_tokens) ? data.sender_device_tokens : [];

    if (!sender_id || !receiver_id || !content) {
      console.log('❌ Missing fields for sendMessage');
      return;
    }

    console.log(`✉️ Socket sendMessage from ${sender_id} to ${receiver_id}`);

    try {
      const { query } = require('./config/database');
      const ioRef = app.get('io');

      // Check if receiver is online
      let isReceiverOnline = false;
      if (ioRef) {
        const receiverSockets = ioRef.sockets.adapter.rooms.get(receiver_id);
        isReceiverOnline = receiverSockets && receiverSockets.size > 0;
      }

      // Insert message - try new schema with delivered_at/read_at
      let insertResult;
      try {
        const deliveredValue = isReceiverOnline ? 'NOW()' : 'NULL';
        insertResult = await query(
          `INSERT INTO messages (sender_id, receiver_id, content, created_at, is_read, delivered_at, read_at)
           VALUES ($1, $2, $3, NOW(), false, ${deliveredValue}, NULL)
           RETURNING id, sender_id, receiver_id, content, is_read, created_at as timestamp, delivered_at, read_at`,
          [sender_id, receiver_id, content]
        );
      } catch (insErr) {
        insertResult = await query(
          `INSERT INTO messages (sender_id, receiver_id, content, created_at, is_read)
           VALUES ($1, $2, $3, NOW(), false)
           RETURNING id, sender_id, receiver_id, content, is_read, created_at as timestamp`,
          [sender_id, receiver_id, content]
        );
      }

      const message = insertResult.rows[0];

      // Check if receiver has the chat open (activeConversations map or conversation room)
      const activeConversations = app.get('activeConversations');
      let receiverHasChatOpen = activeConversations && activeConversations.get(receiver_id) === sender_id;
      try {
        if (ioRef && !receiverHasChatOpen) {
          const roomName = `conv:${[String(sender_id), String(receiver_id)].sort().join(':')}`;
          const convRoom = ioRef.sockets.adapter.rooms.get(roomName);
          const receiverSockets = ioRef.sockets.adapter.rooms.get(String(receiver_id));
          if (convRoom && receiverSockets) {
            for (const sid of convRoom) {
              if (receiverSockets.has(sid)) {
                receiverHasChatOpen = true;
                break;
              }
            }
          }
        }
      } catch (e) {
        console.log('⚠️ Could not check conversation room presence (socket send):', e?.message || e);
      }

      // If receiver viewing chat, atomically mark read for this and previous unread messages
      if (receiverHasChatOpen) {
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
            message.read_at = readAt;
            // Emit messagesRead to sender
            if (ioRef) ioRef.to(sender_id).emit('messagesRead', { messageIds: readIds, readAt, readBy: receiver_id });
            console.log(`✅ Atomically marked ${readIds.length} messages read via socket send (read_at=${readAt})`);
          }
        } catch (err) {
          console.warn('⚠️ Atomic socket read update failed, falling back:', err?.message || err);
        }
      }

      // Device-scoped FCM: fetch receiver device tokens and sender tokens to exclude
      try {
        const receiverDeviceRows = await query('SELECT device_token FROM devices WHERE user_id = $1 AND device_token IS NOT NULL', [receiver_id]);
        const receiverTokens = receiverDeviceRows.rows.map(r => r.device_token).filter(Boolean);

        const senderDeviceRows = await query('SELECT device_token FROM devices WHERE user_id = $1 AND device_token IS NOT NULL', [sender_id]);
        const senderTokens = senderDeviceRows.rows.map(r => r.device_token).filter(Boolean);

        const excludeSet = new Set(senderTokens.map(String));
        if (sender_device_token) excludeSet.add(String(sender_device_token));
        if (Array.isArray(sender_device_tokens)) sender_device_tokens.forEach(t => excludeSet.add(String(t)));

        // Also include any device token(s) registered on the live sender sockets (covers fast-path where client hasn't called devices.register yet)
        try {
          const senderSockets = await ioRef.in(String(sender_id)).fetchSockets();
          for (const s of senderSockets) {
            const tok = s.data?.device_token;
            if (tok) excludeSet.add(String(tok));
          }
        } catch (sockErr) {
          // non-fatal
          console.warn('⚠️ Could not fetch sender sockets for exclude tokens:', sockErr?.message || sockErr);
        }

        const tokensToSend = receiverTokens.filter(t => !excludeSet.has(String(t)));

        console.log(`🔍 [Socket] Sender ${sender_id} exclude tokens: ${[...excludeSet].join(', ')}`);
        console.log(`🔍 [Socket] Receiver ${receiver_id} tokens: ${receiverTokens.join(', ')}`);
        console.log(`🔍 [Socket] Tokens to send after exclusion: ${tokensToSend.join(', ')}`);

        if (tokensToSend.length > 0 && !isReceiverOnline && receiver_id !== sender_id) {
          try {
            const admin = require('./config/firebase');
            const multicastResponse = await admin.messaging().sendMulticast({
              tokens: tokensToSend,
              data: {
                type: 'new_message',
                sender_id: String(sender_id),
                sender_name: String(socket.user?.name || ''),
                content: String(content),
                message_id: String(message.id),
                id: String(message.id)
              },
              android: { priority: 'high' }
            });
            console.log(`✅ FCM multicast sent via socket send to ${tokensToSend.length} device(s) (successes=${multicastResponse.successCount})`);
          } catch (fcme) {
            console.error('❌ FCM multicast error (socket send):', fcme?.message || fcme);
          }
        } else if (isReceiverOnline) {
          console.log('⏩ Skipping FCM - receiver online (socket send)');
        }
      } catch (devErr) {
        console.error('❌ Error fetching device tokens (socket send):', devErr?.message || devErr);
      }

      // Emit new_message to receiver and sender
      try {
        if (ioRef) {
          ioRef.to(receiver_id).emit('new_message', {
            sender_id,
            sender_name: socket.user?.name,
            sender_photo: socket.user?.photo_url,
            content,
            message_id: message.id,
            id: message.id,
            timestamp: message.timestamp,
            delivered_at: message.delivered_at,
            read_at: message.read_at,
            sent_at: message.timestamp
          });

          ioRef.to(sender_id).emit('new_message', {
            sender_id,
            sender_name: socket.user?.name,
            sender_photo: socket.user?.photo_url,
            content,
            message_id: message.id,
            id: message.id,
            timestamp: message.timestamp,
            delivered_at: message.delivered_at,
            read_at: message.read_at,
            sent_at: message.timestamp
          });

          if (isReceiverOnline && message.delivered_at) {
            const deliveredEvent = { messageId: message.id, deliveredAt: message.delivered_at };
            ioRef.to(sender_id).emit('messageDelivered', deliveredEvent);
            ioRef.to(receiver_id).emit('messageDelivered', deliveredEvent);
          }
        }
      } catch (emitErr) {
        console.error('❌ Socket emit error for sendMessage:', emitErr?.message || emitErr);
      }

    } catch (error) {
      console.error('❌ Error in sendMessage handler:', error?.message || error);
    }
  });

  // Handle mark messages as read (for read receipts)
  socket.on('markMessagesRead', async (data) => {
    const userId = socket.user?.id;
    const conversationPartnerId = data.conversationPartnerId;
    
    if (!userId || !conversationPartnerId) {
      console.log('❌ Missing userId or conversationPartnerId for markMessagesRead');
      return;
    }

    console.log(`📖 Marking messages as read: ${conversationPartnerId} → ${userId}`);

    try {
      const { query } = require('./config/database');
      let result;
      try {
        // Atomic update: set is_read and read_at (same timestamp for all rows), returning ids and read_at
        result = await query(
          `WITH updated AS (
             UPDATE messages
             SET is_read = true, read_at = NOW()
             WHERE receiver_id = $1 AND sender_id = $2 AND is_read = false
             RETURNING id, read_at
           ) SELECT id, read_at FROM updated`,
          [userId, conversationPartnerId]
        );
      } catch (updateError) {
        // Fallback to older schema without read_at
        result = await query(
          `UPDATE messages
           SET is_read = true
           WHERE receiver_id = $1 AND sender_id = $2 AND is_read = false
           RETURNING id`,
          [userId, conversationPartnerId]
        );
      }

      if (result.rows.length > 0) {
        const messageIds = result.rows.map(r => r.id);
        const readAt = result.rows[0].read_at || new Date().toISOString();

        console.log(`✅ Atomically marked ${result.rows.length} messages as read (read_at=${readAt})`);

        // Emit to sender so they see read receipts (green ticks)
        io.to(conversationPartnerId).emit('messagesRead', {
          messageIds,
          readAt,
          readBy: userId
        });
      }
    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
    }
  });

  // Handle user opening a conversation (for instant read receipts)
  socket.on('openConversation', ({ conversationPartnerId }) => {
    const userId = socket.user?.id;
    if (!userId || !conversationPartnerId) {
      console.log('❌ Missing userId or conversationPartnerId for openConversation');
      return;
    }
    activeConversations.set(userId, conversationPartnerId);
    // Join a deterministic conversation room so both participants end up in the same room
    // Sorting the IDs guarantees the same room name regardless of which user opens it
    try {
      const room = `conv:${[userId, conversationPartnerId].sort().join(':')}`;
      socket.join(room);
      const size = io.sockets.adapter.rooms.get(room)?.size || 0;
      console.log(`👁️ User ${userId} opened conversation with ${conversationPartnerId} and joined room ${room} (members: ${size})`);
    } catch (e) {
      console.log(`👁️ User ${userId} opened conversation with ${conversationPartnerId}`);
    }
  });

  // Handle user closing a conversation
  socket.on('closeConversation', () => {
    const userId = socket.user?.id;
    if (!userId) return;
    // Leave the deterministic conversation room if present
    const conversationPartnerId = activeConversations.get(userId);
    if (conversationPartnerId) {
      try {
        const room = `conv:${[userId, conversationPartnerId].sort().join(':')}`;
        socket.leave(room);
        const size = io.sockets.adapter.rooms.get(room)?.size || 0;
        console.log(`🚪 User ${userId} left room ${room} (members remaining: ${size})`);
      } catch (e) {
        // fallthrough
      }
    }
    activeConversations.delete(userId);
    console.log(`🚪 User ${userId} closed conversation`);
  });
});

// Make io available to other modules
app.set('io', io);

// Store io instance globally for use in background tasks
global.socketIO = io;

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🔌 Socket.IO enabled for real-time notifications`);
  
  // Start the automated scheduler
  schedulerService.start();
});

module.exports = app;


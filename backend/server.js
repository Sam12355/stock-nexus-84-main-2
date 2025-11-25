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
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:8081',
      'https://stock-nexus-84-main-2-kmth.vercel.app',
      'https://ims-sy.vercel.app'
    ].filter(Boolean),
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize presence subsystem (Redis or in-memory)
presence.init().catch(err => console.warn('Presence init error:', err?.message || err));

// Relay presence events to socket.io (handles cross-instance via Redis pub/sub)
presence.on('user-online', (data) => {
  try {
    const branchRoom = `branch-${data.branchId}`;
    io.to(branchRoom).emit('user-online', data);
  } catch (e) {
    console.error('Presence relay error (user-online):', e?.message || e);
  }
});
presence.on('user-offline', (data) => {
  try {
    const branchRoom = `branch-${data.branchId}`;
    io.to(branchRoom).emit('user-offline', data);
  } catch (e) {
    console.error('Presence relay error (user-offline):', e?.message || e);
  }
});
presence.on('online-members', (data) => {
  try {
    // data should be an array of members; include branchId if present
    const branchId = Array.isArray(data) && data.length > 0 ? data[0].branchId : data.branchId || null;
    if (branchId) {
      io.to(`branch-${branchId}`).emit('online-members', data);
    }
  } catch (e) {
    console.error('Presence relay error (online-members):', e?.message || e);
  }
});

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

// Socket.IO connection handling
io.on('connection', async (socket) => {
  console.log('🔌 Client connected (authenticated):', socket.id, 'user:', socket.user?.id);

  // Determine primary branch for this user
  const branchId = socket.user?.branch_context || socket.user?.branch_id;

  // Auto-join branch room
  if (branchId) {
    const room = `branch-${branchId}`;
    socket.join(room);
    // Add presence
    try {
      await presence.addSocket({ branchId, userId: socket.user.id, socketId: socket.id, meta: { name: socket.user.name, photoUrl: socket.user.photo_url, role: socket.user.role } });
    } catch (e) {
      console.error('Error adding socket to presence:', e?.message || e);
    }
  }

  // Admins can subscribe to admin-overview room to get cross-branch presence
  if (socket.user && socket.user.role === 'admin') {
    socket.join('admins-overview');
  }

  // If client explicitly asks to join other branch (admin or allowed user), handle securely
  socket.on('join-branch', async (requestedBranchId, ack) => {
    try {
      // authorization: admins can join anywhere, others only their own branch
      if (socket.user.role !== 'admin' && (requestedBranchId !== socket.user.branch_id && requestedBranchId !== socket.user.branch_context)) {
        if (typeof ack === 'function') ack({ success: false, error: 'Not authorized for branch' });
        return;
      }
      socket.join(`branch-${requestedBranchId}`);
      // add presence for requested branch
      await presence.addSocket({ branchId: requestedBranchId, userId: socket.user.id, socketId: socket.id, meta: { name: socket.user.name, photoUrl: socket.user.photo_url, role: socket.user.role } });
      if (typeof ack === 'function') ack({ success: true });
    } catch (err) {
      console.error('join-branch error:', err?.message || err);
      if (typeof ack === 'function') ack({ success: false, error: err?.message || 'error' });
    }
  });

  socket.on('disconnect', async (reason) => {
    try {
      console.log('🔌 Client disconnected:', socket.id, 'reason:', reason);
      // Remove presence mapping
      await presence.removeSocket(socket.id);
    } catch (e) {
      console.error('Error removing socket presence:', e?.message || e);
    }
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


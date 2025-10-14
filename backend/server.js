const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

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
const schedulerService = require('./services/scheduler');
const emailService = require('./services/email');

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

// Static files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
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
app.use('/api/debug', debugRoutes);
app.use('/api/weather', weatherRoutes);
console.log('🌤️ Weather routes registered at /api/weather');
console.log('🌤️ Weather routes object:', weatherRoutes);

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

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  // Join user to their branch room for notifications
  socket.on('join-branch', (branchId) => {
    socket.join(`branch-${branchId}`);
    console.log(`👥 User ${socket.id} joined branch room: branch-${branchId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Make io available to other modules
app.set('io', io);

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


const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initDatabase } = require('./database/init');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : true, // Allow all origins in development
  credentials: true
}));

// Compression
app.use(compression());

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug middleware for heartbeat requests
app.use('/api/doors/heartbeat', (req, res, next) => {
  console.log('Heartbeat middleware hit');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// Serve static files
app.use(express.static('public'));

// Disable caching for API endpoints
app.use('/api', (req, res, next) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
});

// Test page for access requests
app.get('/test-access', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test-access.html'));
});

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', generalLimiter);

// Load and setup routes
let authRoutes, userRoutes, doorRoutes, accessGroupRoutes, addLog;

try {
  console.log('Loading route modules...');
  authRoutes = require('./routes/auth');
  console.log('Auth routes module loaded');
  userRoutes = require('./routes/users');
  console.log('User routes module loaded');
  doorRoutes = require('./routes/doors');
  console.log('Door routes module loaded');
  accessGroupRoutes = require('./routes/accessGroups');
  console.log('Access group routes module loaded');
  
const { router: eventRoutes, broadcastEvent } = require('./routes/events');
global.broadcastEvent = broadcastEvent; // Make available globally
console.log('Event routes module loaded');

accessRequestRoutes = require('./routes/accessRequests');
console.log('Access request routes module loaded');

const { router: logsRoutes, addLog: addLogFunction } = require('./routes/logs');
addLog = addLogFunction;
console.log('Logs routes module loaded');

settingsRoutes = require('./routes/settings');
console.log('Settings routes module loaded');
  
  // Setup routes
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/doors', doorRoutes);
app.use('/api/access-groups', accessGroupRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/access-requests', accessRequestRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/settings', settingsRoutes);
  console.log('All routes configured successfully');
} catch (error) {
  console.error('Error loading/setting up routes:', error);
  process.exit(1);
}

// Access page route (for QR code scanning)
app.get('/access', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'access.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use(async (err, req, res, next) => {
  console.error('Error:', err);
  
  // Log error event
  try {
    const EventLogger = require('./utils/eventLogger');
    await EventLogger.logError(req, err, `Route: ${req.method} ${req.path}`);
  } catch (logError) {
    console.error('Failed to log error event:', logError);
  }
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal Server Error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
async function startServer() {
  try {
    // Initialize database first
    console.log('🗄️  Initializing database...');
    console.log('Database path:', process.env.DB_PATH || path.join(__dirname, 'database', 'users.db'));
    await initDatabase();
    console.log('✅ Database initialization completed');
    
    console.log('Starting server...');
    console.log('Port:', PORT);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    
    const server = app.listen(PORT, '0.0.0.0', async () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Web interface: http://localhost:${PORT}`);
      console.log(`🔧 API endpoints: http://localhost:${PORT}/api`);
      console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
      console.log(`\n📋 Default admin credentials:`);
      console.log(`   Email: ${process.env.ADMIN_EMAIL || 'admin@example.com'}`);
      console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
      console.log(`\n⚠️  Please change the default password after first login!`);
      
      // Add log entries
      addLog('success', `Server started on port ${PORT}`);
      addLog('info', `Web interface: http://localhost:${PORT}`);
      addLog('info', `API endpoints: http://localhost:${PORT}/api`);
      addLog('info', `Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Log system startup event
      try {
        const EventLogger = require('./utils/eventLogger');
        const mockReq = { 
          ip: '127.0.0.1', 
          headers: { 'user-agent': 'SimplifiAccess-Server' },
          get: () => 'SimplifiAccess-Server'
        };
        await EventLogger.logSystemEvent(mockReq, 'startup', `SimplifiAccess server started on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
      } catch (logError) {
        console.error('Failed to log startup event:', logError);
      }
    });

    // Start periodic offline door check
    const { Door } = require('./database/door');
    setInterval(async () => {
      try {
        const offlineDoors = await Door.checkOfflineDoors(0.17); // 10 second timeout (0.17 minutes)
        if (offlineDoors.length > 0) {
          console.log(`🔴 ${offlineDoors.length} doors marked as offline due to timeout`);
          
          // Log offline door events
          const EventLogger = require('./utils/eventLogger');
          const mockReq = { 
            ip: '127.0.0.1', 
            headers: { 'user-agent': 'SimplifiAccess-System' },
            get: () => 'SimplifiAccess-System'
          };
          for (const door of offlineDoors) {
            await EventLogger.log(mockReq, 'door', 'offline', 'door', door.id, door.name, `Door marked as offline due to heartbeat timeout`);
          }
        }
      } catch (error) {
        console.error('Error checking offline doors:', error);
      }
    }, 10000); // Check every 10 seconds

    server.on('error', (error) => {
      console.error('Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please use a different port.`);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  
  // Log system shutdown event
  try {
    const EventLogger = require('./utils/eventLogger');
    const mockReq = { 
      ip: '127.0.0.1', 
      headers: { 'user-agent': 'SimplifiAccess-Server' },
      get: () => 'SimplifiAccess-Server'
    };
    await EventLogger.logSystemEvent(mockReq, 'shutdown', 'SimplifiAccess server shutting down gracefully (SIGTERM)');
  } catch (logError) {
    console.error('Failed to log shutdown event:', logError);
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  
  // Log system shutdown event
  try {
    const EventLogger = require('./utils/eventLogger');
    const mockReq = { 
      ip: '127.0.0.1', 
      headers: { 'user-agent': 'SimplifiAccess-Server' },
      get: () => 'SimplifiAccess-Server'
    };
    await EventLogger.logSystemEvent(mockReq, 'shutdown', 'SimplifiAccess server shutting down gracefully (SIGINT)');
  } catch (logError) {
    console.error('Failed to log shutdown event:', logError);
  }
  
  process.exit(0);
});

// Start the server
startServer();
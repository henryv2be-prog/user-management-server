const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
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
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// Compression
app.use(compression());

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static('public'));

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
let authRoutes, userRoutes, doorRoutes, accessGroupRoutes, siteRoutes, areaRoutes, powerMonitoringRoutes, doorStatusRoutes, cameraRoutes, licenseRoutes, offlineCacheRoutes;

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
  siteRoutes = require('./routes/sites');
  console.log('Site routes module loaded');
  areaRoutes = require('./routes/areas');
  console.log('Area routes module loaded');
  powerMonitoringRoutes = require('./routes/powerMonitoring');
  console.log('Power monitoring routes module loaded');
  doorStatusRoutes = require('./routes/doorStatus');
  console.log('Door status routes module loaded');
  cameraRoutes = require('./routes/cameras');
  console.log('Camera routes module loaded');
  licenseRoutes = require('./routes/licenses');
  console.log('License routes module loaded');
  offlineCacheRoutes = require('./routes/offlineCache');
  console.log('Offline cache routes module loaded');
  
  // Setup routes
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/doors', doorRoutes);
  app.use('/api/access-groups', accessGroupRoutes);
  app.use('/api/sites', siteRoutes);
  app.use('/api/areas', areaRoutes);
  app.use('/api/power-monitoring', powerMonitoringRoutes);
  app.use('/api/door-status', doorStatusRoutes);
  app.use('/api/cameras', cameraRoutes);
  app.use('/api/licenses', licenseRoutes);
  app.use('/api/offline-cache', offlineCacheRoutes);
  console.log('All routes configured successfully');
} catch (error) {
  console.error('Error loading/setting up routes:', error);
  process.exit(1);
}

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
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
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
    await initDatabase();
    console.log('✅ Database initialization completed');
    
    console.log('Starting server...');
    console.log('Port:', PORT);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Web interface: http://localhost:${PORT}`);
      console.log(`🔧 API endpoints: http://localhost:${PORT}/api`);
      console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
      console.log(`\n📋 Default admin credentials:`);
      console.log(`   Email: ${process.env.ADMIN_EMAIL || 'admin@example.com'}`);
      console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
      console.log(`\n⚠️  Please change the default password after first login!`);
    });

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
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();
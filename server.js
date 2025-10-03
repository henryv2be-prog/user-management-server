const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fetch = require('node-fetch');
const { initDatabase } = require('./database/init');
require('dotenv').config();

// Load security config first to validate environment
const securityConfig = require('./config/security');
const { enforceHTTPS, contentSecurityPolicy, securityHeaders } = require('./middleware/security');
const { errorHandler } = require('./utils/errors');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for rate limiting (required for deployments behind proxies like Render)
// This tells Express to trust the first proxy in front of it, which is necessary
// for accurate IP detection and rate limiting when deployed behind services like Render
app.set('trust proxy', 1);

// Apply security middleware
app.use(enforceHTTPS);
app.use(securityHeaders);
app.use(contentSecurityPolicy);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // We handle CSP separately
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

// Serve static files with cache-busting for development
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        next();
    });
}
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

// ESP32-specific rate limiter (more lenient for IoT devices)
const esp32Limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // limit each IP to 300 requests per minute (5 per second)
  message: 'ESP32 rate limit exceeded, please slow down requests.',
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

// Apply ESP32 rate limiter to ESP32-specific endpoints
app.use('/api/doors/commands', esp32Limiter);
app.use('/api/doors/heartbeat', esp32Limiter);
app.use('/api/doors/access/request', esp32Limiter);

// Apply general rate limiter to all other API endpoints (excluding ESP32 endpoints)
app.use('/api', (req, res, next) => {
  // Skip rate limiting for ESP32 endpoints that already have their own limiter
  if (req.path.startsWith('/doors/commands') || 
      req.path.startsWith('/doors/heartbeat') || 
      req.path.startsWith('/doors/access/request')) {
    return next();
  }
  return generalLimiter(req, res, next);
});

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

doorTagsRoutes = require('./routes/doorTags');
console.log('Door tags routes module loaded');

const { router: logsRoutes, addLog: addLogFunction } = require('./routes/logs');
addLog = addLogFunction;
console.log('Logs routes module loaded');

settingsRoutes = require('./routes/settings');
console.log('Settings routes module loaded');

sitePlanRoutes = require('./routes/sitePlan');
console.log('Site plan routes module loaded');

webhookRoutes = require('./routes/webhooks');
console.log('Webhook routes module loaded');

webhookSetupRoutes = require('./routes/webhookSetup');
console.log('Webhook setup routes module loaded');

webhookTestRoutes = require('./routes/webhookTest');
console.log('Webhook test routes module loaded');

mobileSettingsRoutes = require('./routes/mobileSettings');
console.log('Mobile settings routes module loaded');
  
  // Setup routes
  // Health check endpoint for keep-alive
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    });
  });

  // Test endpoint for mobile app connection testing
  app.get('/api/test', (req, res) => {
    res.json({
      success: true,
      message: 'Server connection successful',
      timestamp: new Date().toISOString(),
      server: 'SimplifiAccess API'
    });
  });

  // Additional keep-alive endpoints
  app.get('/api/ping', (req, res) => {
    res.json({ pong: Date.now() });
  });

  app.get('/api/status', (req, res) => {
    res.json({ 
      status: 'active',
      timestamp: new Date().toISOString(),
      pid: process.pid
    });
  });

  // Simple text response for external services
  app.get('/ping', (req, res) => {
    res.send('pong');
  });

  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/doors', doorRoutes);
app.use('/api/access-groups', accessGroupRoutes);
app.use('/api/events', eventRoutes);
  app.use('/api/access-requests', accessRequestRoutes);
  app.use('/api/door-tags', doorTagsRoutes);
  app.use('/api/logs', logsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/site-plan', sitePlanRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/webhook-setup', webhookSetupRoutes);
app.use('/api/webhook-test', webhookTestRoutes);
app.use('/api/mobile-settings', mobileSettingsRoutes);
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

// Error handling middleware - Use the new error handler
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Database migration function
async function migrateDatabase() {
  try {
    console.log('🔄 Running database migrations...');
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = process.env.DB_PATH || path.join(__dirname, 'database', 'users.db');
    
    const db = new sqlite3.Database(dbPath);
    
    // Create door_commands table if it doesn't exist
    await new Promise((resolve, reject) => {
      db.run(`CREATE TABLE IF NOT EXISTS door_commands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        door_id INTEGER NOT NULL,
        command TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        executed_at DATETIME,
        FOREIGN KEY (door_id) REFERENCES doors (id)
      )`, (err) => {
        if (err) {
          console.error('❌ Door commands migration failed:', err.message);
          reject(err);
        } else {
          console.log('✅ Door commands table created/verified');
          resolve();
        }
      });
    });
    
    // Create door_tags table if it doesn't exist
    await new Promise((resolve, reject) => {
      db.run(`CREATE TABLE IF NOT EXISTS door_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        door_id INTEGER NOT NULL,
        tag_id TEXT NOT NULL,
        tag_type TEXT NOT NULL CHECK (tag_type IN ('nfc', 'qr')),
        tag_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (door_id) REFERENCES doors (id) ON DELETE CASCADE,
        UNIQUE (tag_id)
      )`, (err) => {
        if (err) {
          console.error('❌ Door tags migration failed:', err.message);
          reject(err);
        } else {
          console.log('✅ Door tags table created/verified');
          resolve();
        }
      });
    });
    
    // Create indexes for door_tags
    await new Promise((resolve, reject) => {
      db.run(`CREATE INDEX IF NOT EXISTS idx_door_tags_door_id ON door_tags(door_id)`, (err) => {
        if (err) {
          console.error('❌ Door tags door_id index failed:', err.message);
          reject(err);
        } else {
          console.log('✅ Door tags door_id index created/verified');
          resolve();
        }
      });
    });
    
    await new Promise((resolve, reject) => {
      db.run(`CREATE INDEX IF NOT EXISTS idx_door_tags_tag_id ON door_tags(tag_id)`, (err) => {
        if (err) {
          console.error('❌ Door tags tag_id index failed:', err.message);
          reject(err);
        } else {
          console.log('✅ Door tags tag_id index created/verified');
          resolve();
        }
      });
    });
    
    db.close();
    
    console.log('✅ Database migration completed');
    
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    throw error;
  }
}

// Database reset function
async function resetDatabase() {
  try {
    console.log('🔄 Resetting database...');
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = process.env.DB_PATH || path.join(__dirname, 'database', 'users.db');
    
    const db = new sqlite3.Database(dbPath);
    
    // Drop all tables
    await new Promise((resolve, reject) => {
      db.exec(`
        DROP TABLE IF EXISTS door_commands;
        DROP TABLE IF EXISTS access_requests;
        DROP TABLE IF EXISTS events;
        DROP TABLE IF EXISTS door_access_groups;
        DROP TABLE IF EXISTS user_access_groups;
        DROP TABLE IF EXISTS access_groups;
        DROP TABLE IF EXISTS doors;
        DROP TABLE IF EXISTS users;
        DROP TABLE IF EXISTS admin_user;
        DROP TABLE IF EXISTS access_log;
      `, (err) => {
        db.close();
        if (err) reject(err);
        else resolve();
      });
    });
    
    console.log('✅ Database reset completed');
    
    // Recreate tables
    await initDatabase();
    console.log('✅ Database recreated successfully');
    
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    throw error;
  }
}

// Start server
async function startServer() {
  try {
    // Reset database if RESET_DB environment variable is set
    if (process.env.RESET_DB === 'true') {
      await resetDatabase();
    } else {
      // Initialize database first
      console.log('🗄️  Initializing database...');
      console.log('Database path:', process.env.DB_PATH || path.join(__dirname, 'database', 'users.db'));
      await initDatabase();
      console.log('✅ Database initialization completed');
    }
    
    console.log('Starting server...');
    console.log('Port:', PORT);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Binding to 0.0.0.0:' + PORT);
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Web interface: http://localhost:${PORT}`);
      console.log(`🔧 API endpoints: http://localhost:${PORT}/api`);
      console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
      console.log(`\n📋 Default admin credentials:`);
      console.log(`   Email: ${process.env.ADMIN_EMAIL || 'admin@example.com'}`);
      console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
      console.log(`\n⚠️  Please change the default password after first login!`);
      
      // Add log entries (non-blocking)
      try {
        if (typeof addLog === 'function') {
          addLog('success', `Server started on port ${PORT}`);
          addLog('info', `Web interface: http://localhost:${PORT}`);
          addLog('info', `API endpoints: http://localhost:${PORT}/api`);
          addLog('info', `Environment: ${process.env.NODE_ENV || 'development'}`);
        } else {
          console.log('⚠️ addLog function not available, skipping log entries');
        }
      } catch (logError) {
        console.error('Failed to add log entries:', logError);
      }
      
      // Log system startup event (non-blocking)
      setImmediate(async () => {
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
    });

    // Start periodic offline door check
    const { Door } = require('./database/door');
    setInterval(async () => {
      try {
        const offlineDoors = await Door.checkOfflineDoors(3); // 3 minute timeout (more reasonable for ESP32 devices)
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
    }, 30000); // Check every 30 seconds (less frequent)

    server.on('error', (error) => {
      console.error('Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please use a different port.`);
      }
      console.error('Server failed to start. Exiting...');
      process.exit(1);
    });

    // Add timeout to detect if server fails to start
    setTimeout(() => {
      if (!server.listening) {
        console.error('❌ Server failed to start within 30 seconds');
        console.error('Port:', PORT);
        console.error('Environment:', process.env.NODE_ENV);
        process.exit(1);
      }
    }, 30000);

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

// Aggressive keep-alive mechanism to prevent Render instance from sleeping
function startKeepAlive() {
  const keepAliveInterval = 2 * 60 * 1000; // 2 minutes - more aggressive
  const externalPingInterval = 3 * 60 * 1000; // 3 minutes for external pings
  
  // Internal ping (self-ping)
  setInterval(async () => {
    try {
      const response = await fetch(`http://localhost:${PORT}/api/health`, {
        method: 'GET',
        headers: {
          'User-Agent': 'KeepAlive/1.0'
        }
      });
      
      if (response.ok) {
        console.log('✅ Internal keep-alive ping successful');
      } else {
        console.log('⚠️ Internal keep-alive ping failed:', response.status);
      }
    } catch (error) {
      console.log('❌ Internal keep-alive ping error:', error.message);
    }
  }, keepAliveInterval);
  
  // External ping (if we have a public URL)
  if (process.env.RENDER_EXTERNAL_URL) {
    setInterval(async () => {
      try {
        const response = await fetch(`${process.env.RENDER_EXTERNAL_URL}/api/health`, {
          method: 'GET',
          headers: {
            'User-Agent': 'ExternalKeepAlive/1.0'
          }
        });
        
        if (response.ok) {
          console.log('✅ External keep-alive ping successful');
        } else {
          console.log('⚠️ External keep-alive ping failed:', response.status);
        }
      } catch (error) {
        console.log('❌ External keep-alive ping error:', error.message);
      }
    }, externalPingInterval);
  }
  
  // Additional activity generation
  setInterval(() => {
    // Generate some CPU activity to keep instance active
    const start = Date.now();
    let result = 0;
    for (let i = 0; i < 1000000; i++) {
      result += Math.random();
    }
    const duration = Date.now() - start;
    console.log(`🔄 CPU activity generated (${duration}ms)`);
  }, 4 * 60 * 1000); // Every 4 minutes

  // Multiple ping strategies
  const pingEndpoints = ['/api/health', '/api/ping', '/api/status', '/ping'];
  let currentEndpointIndex = 0;
  
  setInterval(async () => {
    const endpoint = pingEndpoints[currentEndpointIndex];
    currentEndpointIndex = (currentEndpointIndex + 1) % pingEndpoints.length;
    
    try {
      const response = await fetch(`http://localhost:${PORT}${endpoint}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'MultiPing/1.0'
        }
      });
      
      if (response.ok) {
        console.log(`✅ Multi-ping successful: ${endpoint}`);
      } else {
        console.log(`⚠️ Multi-ping failed: ${endpoint} (${response.status})`);
      }
    } catch (error) {
      console.log(`❌ Multi-ping error: ${endpoint} - ${error.message}`);
    }
  }, 90 * 1000); // Every 90 seconds
  
  console.log(`🔄 Aggressive keep-alive mechanism started (internal: ${keepAliveInterval / 1000 / 60}min, external: ${externalPingInterval / 1000 / 60}min)`);
}

// Start the server
console.log('🚀 Starting SimplifiAccess server...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port:', process.env.PORT || 3000);
console.log('Database path:', process.env.DB_PATH || path.join(__dirname, 'database', 'users.db'));

startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  console.error('Error details:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});

// Start keep-alive after server is running
setTimeout(() => {
  startKeepAlive();
}, 5000); // Wait 5 seconds for server to fully start
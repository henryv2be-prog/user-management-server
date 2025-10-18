import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

import config from './config/index.js';
import logger from './config/logger.js';
import database from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import { securityMiddleware } from './middleware/security.js';
import { setupRoutes } from './routes/index.js';
import { WebSocketManager } from './services/WebSocketManager.js';
import { EventLogger } from './services/EventLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Server {
  constructor() {
    this.app = express();
    this.server = null;
    this.wss = null;
    this.wsManager = null;
    this.eventLogger = null;
  }

  async initialize() {
    try {
      logger.info('🚀 Initializing SimplifiAccess V2 Server...');
      
      // Connect to database
      await database.connect();
      
      // Initialize services
      this.eventLogger = new EventLogger();
      this.wsManager = new WebSocketManager();
      
      // Setup middleware
      this.setupMiddleware();
      
      // Setup routes
      await setupRoutes(this.app);
      
      // Setup error handling
      this.setupErrorHandling();
      
      // Create HTTP server
      this.server = createServer(this.app);
      
      // Setup WebSocket server
      this.setupWebSocket();
      
      logger.info('✅ Server initialization completed');
      
    } catch (error) {
      logger.error('❌ Server initialization failed:', error);
      throw error;
    }
  }

  setupMiddleware() {
    // Trust proxy for rate limiting
    this.app.set('trust proxy', 1);
    
    // Security middleware
    this.app.use(securityMiddleware);
    
    // CORS
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials
    }));
    
    // Compression
    this.app.use(compression());
    
    // Logging
    this.app.use(morgan('combined', {
      stream: { write: message => logger.info(message.trim()) }
    }));
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Rate limiting
    this.setupRateLimiting();
    
    // Static files
    this.app.use(express.static(path.join(__dirname, '../public')));
  }

  setupRateLimiting() {
    // General rate limiter
    const generalLimiter = rateLimit({
      windowMs: config.rateLimit.window,
      max: config.rateLimit.max,
      message: 'Too many requests, please try again later.',
      standardHeaders: true,
      legacyHeaders: false
    });

    // Auth rate limiter
    const authLimiter = rateLimit({
      windowMs: config.rateLimit.window,
      max: config.rateLimit.authMax,
      message: 'Too many authentication attempts, please try again later.',
      standardHeaders: true,
      legacyHeaders: false
    });

    // ESP32 rate limiter
    const esp32Limiter = rateLimit({
      windowMs: config.esp32.rateLimitWindow,
      max: config.esp32.rateLimitMax,
      message: 'ESP32 rate limit exceeded, please slow down requests.',
      standardHeaders: true,
      legacyHeaders: false
    });

    // Apply rate limiters
    this.app.use('/api/auth', authLimiter);
    this.app.use('/api/doors/commands', esp32Limiter);
    this.app.use('/api/doors/heartbeat', esp32Limiter);
    this.app.use('/api/doors/access/request', esp32Limiter);
    this.app.use('/api', generalLimiter);
  }

  setupWebSocket() {
    this.wss = new WebSocketServer({ 
      server: this.server,
      path: config.websocket.path
    });
    
    this.wsManager.initialize(this.wss);
    logger.info(`🔌 WebSocket server ready on path: ${config.websocket.path}`);
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ 
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method
      });
    });

    // Error handler
    this.app.use(errorHandler);
  }

  async start() {
    try {
      await this.initialize();
      
      this.server.listen(config.port, config.host, () => {
        logger.info(`🚀 Server running on ${config.host}:${config.port}`);
        logger.info(`📱 Web interface: http://${config.host}:${config.port}`);
        logger.info(`🔧 API endpoints: http://${config.host}:${config.port}/api`);
        logger.info(`❤️  Health check: http://${config.host}:${config.port}/api/health`);
        logger.info(`🔌 WebSocket: ws://${config.host}:${config.port}${config.websocket.path}`);
        logger.info(`\n📋 Default admin credentials:`);
        logger.info(`   Email: ${config.admin.email}`);
        logger.info(`   Password: ${config.admin.password}`);
        logger.info(`\n⚠️  Please change the default password after first login!`);
        
        // Log startup event
        this.eventLogger.logSystemEvent('startup', `Server started on ${config.host}:${config.port}`);
      });

      // Graceful shutdown
      this.setupGracefulShutdown();
      
    } catch (error) {
      logger.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      
      try {
        // Log shutdown event
        this.eventLogger.logSystemEvent('shutdown', `Server shutting down (${signal})`);
        
        // Close WebSocket connections
        if (this.wsManager) {
          this.wsManager.closeAllConnections();
        }
        
        // Close HTTP server
        if (this.server) {
          this.server.close(() => {
            logger.info('✅ HTTP server closed');
          });
        }
        
        // Close database connection
        await database.disconnect();
        
        logger.info('✅ Graceful shutdown completed');
        process.exit(0);
        
      } catch (error) {
        logger.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// Start the server
const server = new Server();
server.start().catch((error) => {
  logger.error('❌ Failed to start server:', error);
  process.exit(1);
});

export default server;
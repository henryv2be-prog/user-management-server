const express = require('express');
const Event = require('../database/event');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validation');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();

// Store active SSE connections
const sseConnections = new Set();

// Cache prevention middleware for all routes
router.use((req, res, next) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Last-Modified': new Date().toUTCString(),
    'ETag': `"${Date.now()}"`
  });
  next();
});

// Test endpoint to verify SSE route is accessible
router.get('/test', (req, res) => {
  res.json({ 
    message: 'SSE route is accessible',
    timestamp: new Date().toISOString(),
    sseConnections: sseConnections.size
  });
});

// Test endpoint to manually trigger SSE message
router.get('/test-connection', (req, res) => {
  console.log('🧪 Test connection endpoint accessed');
  console.log('🧪 Active connections:', sseConnections.size);
  
  // Send a test message to all connected clients
  const testMessage = {
    type: 'test',
    message: 'Manual test message',
    timestamp: new Date().toISOString()
  };
  
  const message = `data: ${JSON.stringify(testMessage)}\n\n`;
  
  sseConnections.forEach((connection, index) => {
    try {
      connection.res.write(message);
      console.log(`✅ Test message sent to client ${index + 1}`);
    } catch (error) {
      console.error(`❌ Error sending test message to client ${index + 1}:`, error);
      sseConnections.delete(connection);
    }
  });
  
  res.json({
    message: 'Test message sent to all connected clients',
    connections: sseConnections.size,
    testMessage
  });
});

// Debug endpoint to check SSE connection status
router.get('/debug-status', (req, res) => {
  console.log('🔍 Debug status endpoint accessed');
  
  const connectionDetails = Array.from(sseConnections).map((connection, index) => ({
    index: index + 1,
    userId: connection.userId,
    connectedAt: connection.connectedAt,
    isActive: sseConnections.has(connection)
  }));
  
  console.log('🔍 Connection details:', connectionDetails);
  
  res.json({
    totalConnections: sseConnections.size,
    connections: connectionDetails,
    timestamp: new Date().toISOString()
  });
});

// Token validation endpoint for debugging
router.get('/validate-token', (req, res) => {
  const token = req.query.token;
  
  if (!token) {
    return res.json({ 
      valid: false, 
      error: 'No token provided',
      jwtSecretAvailable: !!process.env.JWT_SECRET,
      jwtSecretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({
      valid: true,
      decoded: {
        id: decoded.id,
        role: decoded.role,
        exp: decoded.exp,
        expDate: new Date(decoded.exp * 1000).toISOString()
      },
      jwtSecretAvailable: !!process.env.JWT_SECRET,
      jwtSecretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0
    });
  } catch (error) {
    res.json({
      valid: false,
      error: error.message,
      errorType: error.name,
      jwtSecretAvailable: !!process.env.JWT_SECRET,
      jwtSecretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0
    });
  }
});

// Simple SSE test endpoint (no auth required)
router.get('/test-sse', (req, res) => {
  console.log('🧪 SSE test endpoint accessed');
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  res.write(`data: ${JSON.stringify({
    type: 'test',
    message: 'SSE test connection successful',
    timestamp: new Date().toISOString()
  })}\n\n`);
  
  // Send a few test messages
  let count = 0;
  const testInterval = setInterval(() => {
    count++;
    res.write(`data: ${JSON.stringify({
      type: 'test',
      message: `Test message ${count}`,
      timestamp: new Date().toISOString()
    })}\n\n`);
    
    if (count >= 3) {
      clearInterval(testInterval);
      res.end();
    }
  }, 1000);
});

// Server-Sent Events endpoint for live event updates (admin only)
router.get('/stream', async (req, res) => {
  console.log('🔗 SSE /stream endpoint accessed');
  console.log('🔗 Request headers:', req.headers);
  console.log('🔗 Query params:', req.query);
  console.log('🔗 User-Agent:', req.headers['user-agent']);
  console.log('🔗 Accept header:', req.headers.accept);
  
  try {
  
  // Extract token from query parameter
  const token = req.query.token;
  
  // Set SSE headers first to establish the connection
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  console.log('📡 SSE headers set, connection should be established');
  
  // Add response close detection
  res.on('close', () => {
    console.log('📡 Response closed by server/client');
  });
  
  res.on('finish', () => {
    console.log('📡 Response finished');
  });
  
  if (!token) {
    console.log('❌ SSE: No token provided');
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      message: 'Token required for event stream',
      timestamp: new Date().toISOString()
    })}\n\n`);
    res.end();
    return;
  }
  
  // Verify token and get user
  try {
    console.log('🔍 SSE: Verifying token...');
    console.log('🔍 SSE: JWT_SECRET available:', !!process.env.JWT_SECRET);
    console.log('🔍 SSE: JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 'undefined');
    console.log('🔍 SSE: Token length:', token.length);
    console.log('🔍 SSE: Token preview:', token.substring(0, 20) + '...');
    
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔍 SSE: Token decoded successfully');
    console.log('🔍 SSE: Decoded token keys:', Object.keys(decoded));
    console.log('🔍 SSE: Decoded token values:', decoded);
    console.log('🔍 SSE: Looking for userId:', decoded.userId);
    console.log('🔍 SSE: Looking for id:', decoded.id);
    console.log('🔍 SSE: Looking for role:', decoded.role);
    console.log('🔍 SSE: All token properties:', JSON.stringify(decoded, null, 2));
    
    if (!decoded.userId) {
      console.log('❌ SSE: Token missing user ID');
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        message: 'Token missing user ID',
        timestamp: new Date().toISOString()
      })}\n\n`);
      res.end();
      return;
    }
    
    // Get the full user object from database (consistent with auth middleware)
    const { User } = require('../database/models');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      console.log('❌ SSE: User not found in database');
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        message: 'User not found',
        timestamp: new Date().toISOString()
      })}\n\n`);
      res.end();
      return;
    }
    
    // Check admin role from database (more reliable than token)
    if (user.role !== 'admin') {
      console.log('❌ SSE: Non-admin user attempted to connect:', user.role);
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        message: 'Admin access required for event stream',
        timestamp: new Date().toISOString()
      })}\n\n`);
      res.end();
      return;
    }
    
    req.user = user;
    console.log(`✅ SSE: Admin user ${req.user.id} authenticated successfully`);
    console.log(`✅ SSE: req.user object:`, {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      hasId: !!req.user.id
    });
  } catch (error) {
    console.log('❌ SSE: Token verification failed:', error.message);
    console.log('❌ SSE: Error type:', error.name);
    console.log('❌ SSE: Full error:', error);
    
    let errorMessage = 'Token validation failed';
    if (error.message.includes('secret')) {
      errorMessage = 'JWT secret configuration error';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Invalid token format';
    } else if (error.name === 'TokenExpiredError') {
      errorMessage = 'Token has expired';
    } else {
      errorMessage = `Token validation failed: ${error.message}`;
    }
    
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      message: errorMessage,
      timestamp: new Date().toISOString()
    })}\n\n`);
    res.end();
    return;
  }

  // Create connection object
  const connection = {
    res,
    userId: req.user.id,
    connectedAt: new Date().toISOString(),
    lastEventId: req.headers['last-event-id'] || 0,
    lastHeartbeat: Date.now()
  };

  // Check for existing connections for this user BEFORE adding new connection
  const existingConnections = Array.from(sseConnections).filter(conn => conn.userId === req.user.id);
  console.log(`🔍 Checking for existing connections for user ${req.user.id} (${req.user.email})`);
  console.log(`🔍 Found ${existingConnections.length} existing connections`);
  
  // Close existing connections for this user
  if (existingConnections.length > 0) {
    console.log(`🧹 Closing ${existingConnections.length} existing connections for user ${req.user.id}`);
    existingConnections.forEach((conn, index) => {
      try {
        conn.res.end();
        sseConnections.delete(conn);
        console.log(`✅ Closed existing connection ${index + 1} for user ${req.user.id}`);
      } catch (error) {
        console.log(`❌ Error closing existing connection ${index + 1}:`, error.message);
        sseConnections.delete(conn); // Remove from set even if close failed
      }
    });
  }
  
  // Add new connection to set
  sseConnections.add(connection);
  console.log(`✅ Added new connection for user ${req.user.id}. Total connections: ${sseConnections.size}`);
  
  // Debug req.user before logging
  console.log(`🔍 SSE: About to log connection - req.user:`, {
    exists: !!req.user,
    id: req.user?.id,
    email: req.user?.email,
    role: req.user?.role
  });
  
  console.log(`📡 SSE connection established for user ${req.user.id}. Total connections: ${sseConnections.size}`);
  console.log(`📡 Connection object:`, {
    userId: connection.userId,
    connectedAt: connection.connectedAt,
    resHeadersSent: connection.res.headersSent
  });

  // Send initial connection message to ALL connections for this user
  const connectionMessage = {
    type: 'connection',
    message: 'Connected to event stream',
    timestamp: new Date().toISOString()
  };
  
  console.log('📤 Sending initial connection message to all connections:', connectionMessage);
  
  // Send to all connections for this user
  const userConnections = Array.from(sseConnections).filter(conn => conn.userId === req.user.id);
  console.log(`📤 Found ${userConnections.length} connections for user ${req.user.id}`);
  
  userConnections.forEach((conn, index) => {
    try {
      console.log(`📤 Sending to connection ${index + 1}:`, {
        writable: conn.res.writable,
        destroyed: conn.res.destroyed,
        headersSent: conn.res.headersSent,
        finished: conn.res.finished
      });
      
      if (!conn.res.writable || conn.res.destroyed || conn.res.finished) {
        console.log(`⚠️ Connection ${index + 1} is not writable, removing from active connections`);
        sseConnections.delete(conn);
        return;
      }
      
      conn.res.write(`data: ${JSON.stringify(connectionMessage)}\n\n`);
      console.log(`✅ Initial connection message sent to connection ${index + 1}`);
    } catch (writeError) {
      console.error(`❌ Error sending initial connection message to connection ${index + 1}:`, writeError);
      sseConnections.delete(conn);
    }
  });

  // Set up heartbeat to keep connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      if (sseConnections.has(connection)) {
        res.write(`data: ${JSON.stringify({ 
          type: 'heartbeat', 
          timestamp: new Date().toISOString()
        })}\n\n`);
        connection.lastHeartbeat = Date.now();
      } else {
        clearInterval(heartbeatInterval);
      }
    } catch (error) {
      console.log(`❌ SSE heartbeat error for user ${req.user.id}:`, error.message);
      clearInterval(heartbeatInterval);
      sseConnections.delete(connection);
    }
  }, 30000); // Send heartbeat every 30 seconds

  // Handle client disconnect
  req.on('close', () => {
    console.log(`📡 SSE connection closed by client for user ${req.user.id}`);
    clearInterval(heartbeatInterval);
    sseConnections.delete(connection);
    console.log(`📡 SSE connection closed for user ${req.user.id}. Remaining connections: ${sseConnections.size}`);
  });

  // Handle connection errors
  req.on('error', (error) => {
    console.log(`❌ SSE connection error for user ${req.user.id}:`, error.message);
    clearInterval(heartbeatInterval);
    sseConnections.delete(connection);
  });
  
  } catch (error) {
    console.error('❌ SSE route error:', error);
    console.error('❌ SSE route error stack:', error.stack);
    
    // Try to send error message if response is still writable
    try {
      if (!res.headersSent) {
        res.writeHead(500, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });
      }
      
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        message: 'Internal server error in SSE route',
        timestamp: new Date().toISOString()
      })}\n\n`);
      res.end();
    } catch (writeError) {
      console.error('❌ Error writing error response:', writeError);
    }
  }
});

// Get events with pagination and filtering (admin only)
router.get('/', authenticate, requireAdmin, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, action, entityType, userId } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      action,
      entityType,
      userId: userId ? parseInt(userId) : undefined
    };

    const [events, totalCount] = await Promise.all([
      Event.findAll(options),
      Event.count(options)
    ]);

    const totalPages = Math.ceil(totalCount / options.limit);

    res.json({
      events,
      pagination: {
        currentPage: options.page,
        totalPages,
        totalCount,
        hasNext: options.page < totalPages,
        hasPrev: options.page > 1
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve events'
    });
  }
});

// Get recent events for dashboard (admin only)
router.get('/recent', authenticate, requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const events = await Event.getRecentEvents(limit);

    res.json({ events });
  } catch (error) {
    console.error('Get recent events error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve recent events'
    });
  }
});

// Get event by ID (admin only)
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    
    if (isNaN(eventId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid event ID'
      });
    }

    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Event not found'
      });
    }

    res.json({ event });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve event'
    });
  }
});

// Get event statistics (admin only)
router.get('/stats/overview', authenticate, requireAdmin, async (req, res) => {
  try {
    const [totalEvents, userEvents, doorEvents, accessGroupEvents, authEvents, errorEvents] = await Promise.all([
      Event.count({}),
      Event.count({ type: 'user' }),
      Event.count({ type: 'door' }),
      Event.count({ type: 'access_group' }),
      Event.count({ type: 'auth' }),
      Event.count({ type: 'error' })
    ]);

    // Get events from last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const recentEvents = await Event.findAll({
      page: 1,
      limit: 1000 // Get all recent events for filtering
    });

    const last24Hours = recentEvents.filter(event => 
      new Date(event.createdAt) > yesterday
    ).length;

    res.json({
      stats: {
        totalEvents,
        userEvents,
        doorEvents,
        accessGroupEvents,
        authEvents,
        errorEvents,
        last24Hours
      }
    });
  } catch (error) {
    console.error('Get event stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve event statistics'
    });
  }
});

// Function to broadcast new events to all connected clients
function broadcastEvent(event) {
  console.log(`📡 Broadcasting event: ${event.id} (${event.type}:${event.action}) to ${sseConnections.size} clients`);
  
  const eventData = {
    type: 'new_event',
    event: event.toJSON(),
    timestamp: new Date().toISOString()
  };

  const message = `data: ${JSON.stringify(eventData)}\n\n`;
  
  sseConnections.forEach((connection, index) => {
    try {
      connection.res.write(message);
      console.log(`✅ Event sent to client ${index + 1}`);
    } catch (error) {
      console.error(`❌ Error sending SSE message to client ${index + 1}:`, error);
      sseConnections.delete(connection);
    }
  });
}

// Export the broadcast function for use in other modules
module.exports = { router, broadcastEvent };

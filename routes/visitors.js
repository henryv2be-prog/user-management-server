const express = require('express');
const { Visitor } = require('../database/visitor');
const { User } = require('../database/models');
const { 
  validateVisitor, 
  validateVisitorUpdate, 
  validateId, 
  validatePagination 
} = require('../middleware/validation');
const { 
  authenticate, 
  requireAdmin, 
  authorizeSelfOrAdmin 
} = require('../middleware/auth');
const EventLogger = require('../utils/eventLogger');

const router = express.Router();

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

// Get all visitors (admin only)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { hostUserId, search, page = 1, limit = 10 } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit)
    };
    
    if (hostUserId) {
      options.hostUserId = parseInt(hostUserId);
    }
    
    if (search) {
      options.search = search;
    }
    
    const [visitors, totalCount] = await Promise.all([
      Visitor.findAll(options),
      Visitor.count(options)
    ]);
    
    const totalPages = Math.ceil(totalCount / options.limit);
    
    res.json({
      visitors: visitors.map(visitor => visitor.toJSON()),
      pagination: {
        page: options.page,
        limit: options.limit,
        totalCount,
        totalPages,
        hasNext: options.page < totalPages,
        hasPrev: options.page > 1
      }
    });
  } catch (error) {
    console.error('Get visitors error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve visitors'
    });
  }
});

// Get visitors by host user ID
router.get('/host/:hostUserId', authenticate, validateId, async (req, res) => {
  try {
    const hostUserId = parseInt(req.params.hostUserId);
    
    // Check if user is admin or the host user themselves
    if (!req.user.hasRole('admin') && req.user.id !== hostUserId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only view your own visitors'
      });
    }
    
    const visitors = await Visitor.findByHostUserId(hostUserId);
    
    res.json({
      visitors: visitors.map(visitor => visitor.toJSON())
    });
  } catch (error) {
    console.error('Get visitors by host error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve visitors'
    });
  }
});

// Get visitor by ID
router.get('/:id', authenticate, validateId, async (req, res) => {
  try {
    const visitorId = parseInt(req.params.id);
    const visitor = await Visitor.findById(visitorId);
    
    if (!visitor) {
      return res.status(404).json({
        error: 'Visitor not found',
        message: 'The requested visitor does not exist'
      });
    }
    
    // Check if user is admin or the host user
    if (!req.user.hasRole('admin') && req.user.id !== visitor.hostUserId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only view your own visitors'
      });
    }
    
    res.json({
      visitor: visitor.toJSON()
    });
  } catch (error) {
    console.error('Get visitor error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve visitor'
    });
  }
});

// Create new visitor
router.post('/', authenticate, validateVisitor, async (req, res) => {
  try {
    const { email, password, firstName, lastName, hostUserId, accessInstances = 2 } = req.body;
    
    // Check if user is admin or creating visitor for themselves
    if (!req.user.hasRole('admin') && req.user.id !== hostUserId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only create visitors for yourself'
      });
    }
    
    // Verify host user exists
    const hostUser = await User.findById(hostUserId);
    if (!hostUser) {
      return res.status(404).json({
        error: 'Host user not found',
        message: 'The specified host user does not exist'
      });
    }
    
    const existingVisitor = await Visitor.findByEmail(email);
    if (existingVisitor) {
      return res.status(409).json({
        error: 'Visitor already exists',
        message: 'A visitor with this email already exists'
      });
    }
    
    // Generate username from email if not provided
    const username = email.split('@')[0];
    
    const visitorId = await Visitor.create({
      username,
      email,
      password,
      firstName,
      lastName,
      hostUserId,
      accessInstances
    });
    
    const visitor = await Visitor.findById(visitorId);
    
    // Log visitor creation event
    await EventLogger.logEvent(req, {
      type: 'visitor',
      action: 'created',
      entityType: 'visitor',
      entityId: visitor.id,
      entityName: `${visitor.firstName} ${visitor.lastName}`,
      details: `Visitor created for host user ${hostUser.firstName} ${hostUser.lastName}`,
      timestamp: new Date().toISOString()
    });
    
    res.status(201).json({
      message: 'Visitor created successfully',
      visitor: visitor.toJSON()
    });
  } catch (error) {
    console.error('Create visitor error:', error);
    
    if (error.message === 'Email already exists') {
      return res.status(409).json({
        error: 'Visitor already exists',
        message: 'A visitor with this email already exists'
      });
    }
    
    if (error.message === 'Username already exists') {
      return res.status(409).json({
        error: 'Visitor already exists',
        message: 'A visitor with this username already exists'
      });
    }
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create visitor'
    });
  }
});

// Update visitor
router.put('/:id', authenticate, validateId, validateVisitorUpdate, async (req, res) => {
  try {
    const visitorId = parseInt(req.params.id);
    const visitor = await Visitor.findById(visitorId);
    
    if (!visitor) {
      return res.status(404).json({
        error: 'Visitor not found',
        message: 'The requested visitor does not exist'
      });
    }
    
    // Check if user is admin or the host user
    if (!req.user.hasRole('admin') && req.user.id !== visitor.hostUserId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own visitors'
      });
    }
    
    const updatedVisitor = await visitor.update(req.body);
    
    // Log visitor update event
    const changes = Object.keys(req.body).filter(key => req.body[key] !== undefined);
    await EventLogger.logEvent(req, {
      type: 'visitor',
      action: 'updated',
      entityType: 'visitor',
      entityId: visitor.id,
      entityName: `${visitor.firstName} ${visitor.lastName}`,
      details: `Visitor updated: ${changes.join(', ')}`,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      message: 'Visitor updated successfully',
      visitor: updatedVisitor.toJSON()
    });
  } catch (error) {
    console.error('Update visitor error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update visitor'
    });
  }
});

// Delete visitor (admin only)
router.delete('/:id', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const visitorId = parseInt(req.params.id);
    const visitor = await Visitor.findById(visitorId);
    
    if (!visitor) {
      return res.status(404).json({
        error: 'Visitor not found',
        message: 'The requested visitor does not exist'
      });
    }
    
    // Log visitor deletion event before deleting
    await EventLogger.logEvent(req, {
      type: 'visitor',
      action: 'deleted',
      entityType: 'visitor',
      entityId: visitor.id,
      entityName: `${visitor.firstName} ${visitor.lastName}`,
      details: `Visitor deleted`,
      timestamp: new Date().toISOString()
    });
    
    await visitor.delete();
    
    res.json({
      message: 'Visitor deleted successfully'
    });
  } catch (error) {
    console.error('Delete visitor error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete visitor'
    });
  }
});

// Add access instances to visitor
router.post('/:id/add-instances', authenticate, validateId, async (req, res) => {
  try {
    const visitorId = parseInt(req.params.id);
    const { additionalInstances } = req.body;
    
    if (!additionalInstances || additionalInstances <= 0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Additional instances must be a positive number'
      });
    }
    
    const visitor = await Visitor.findById(visitorId);
    
    if (!visitor) {
      return res.status(404).json({
        error: 'Visitor not found',
        message: 'The requested visitor does not exist'
      });
    }
    
    // Check if user is admin or the host user
    if (!req.user.hasRole('admin') && req.user.id !== visitor.hostUserId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only manage your own visitors'
      });
    }
    
    await visitor.addAccessInstances(additionalInstances);
    
    // Log access instances addition event
    await EventLogger.logEvent(req, {
      type: 'visitor',
      action: 'instances_added',
      entityType: 'visitor',
      entityId: visitor.id,
      entityName: `${visitor.firstName} ${visitor.lastName}`,
      details: `${additionalInstances} access instances added`,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      message: 'Access instances added successfully',
      visitor: visitor.toJSON()
    });
  } catch (error) {
    console.error('Add access instances error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add access instances'
    });
  }
});

// Get visitor access history
router.get('/:id/access-history', authenticate, validateId, async (req, res) => {
  try {
    const visitorId = parseInt(req.params.id);
    const { limit = 50 } = req.query;
    
    const visitor = await Visitor.findById(visitorId);
    
    if (!visitor) {
      return res.status(404).json({
        error: 'Visitor not found',
        message: 'The requested visitor does not exist'
      });
    }
    
    // Check if user is admin or the host user
    if (!req.user.hasRole('admin') && req.user.id !== visitor.hostUserId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only view your own visitors\' access history'
      });
    }
    
    const accessHistory = await visitor.getAccessHistory(parseInt(limit));
    
    res.json({
      visitor: visitor.toJSON(),
      accessHistory
    });
  } catch (error) {
    console.error('Get visitor access history error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve access history'
    });
  }
});

// Process door access attempt (for NFC/QR scanning)
router.post('/:id/access/:doorId', authenticate, validateId, async (req, res) => {
  try {
    const visitorId = parseInt(req.params.id);
    const doorId = parseInt(req.params.doorId);
    
    const visitor = await Visitor.findById(visitorId);
    
    if (!visitor) {
      return res.status(404).json({
        error: 'Visitor not found',
        message: 'The requested visitor does not exist'
      });
    }
    
    if (!visitor.isActive) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Visitor account is inactive'
      });
    }
    
    const result = await Visitor.processAccessAttempt(visitorId, doorId);
    
    res.json({
      accessGranted: result.accessGranted,
      reason: result.reason,
      remainingInstances: visitor.remainingInstances - (result.accessGranted ? 1 : 0)
    });
  } catch (error) {
    console.error('Process visitor access error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process access attempt'
    });
  }
});

module.exports = router;

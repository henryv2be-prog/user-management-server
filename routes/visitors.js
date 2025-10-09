const express = require('express');
const { Visitor } = require('../database/visitor');
const { User } = require('../database/models');
const { 
  validateVisitor, 
  validateVisitorUpdate
} = require('../middleware/validation');
const { authenticate, requireAdmin, authorizeSelfOrAdmin } = require('../middleware/auth');
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

// Get all visitors (admin only) - MUST be before /:id route
router.get('/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId, search, page = 1, limit = 10, activeOnly, validOnly } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit)
    };
    
    if (userId) {
      options.userId = parseInt(userId);
    }
    
    if (search) {
      options.search = search;
    }
    
    if (activeOnly === 'true') {
      options.activeOnly = true;
    }
    
    if (validOnly === 'true') {
      options.validOnly = true;
    }
    
    const [visitors, totalCount] = await Promise.all([
      Visitor.findAll(options),
      Visitor.count(options)
    ]);
    
    const totalPages = Math.ceil(totalCount / options.limit);
    
    res.json({
      visitors,
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
    console.error('Get all visitors error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve visitors'
    });
  }
});

// Get visitors for a specific user
router.get('/user/:userId', authenticate, authorizeSelfOrAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { search, page = 1, limit = 10, activeOnly, validOnly } = req.query;
    
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit)
    };
    
    if (search) {
      options.search = search;
    }
    
    if (activeOnly === 'true') {
      options.activeOnly = true;
    }
    
    if (validOnly === 'true') {
      options.validOnly = true;
    }
    
    const [visitors, totalCount] = await Promise.all([
      Visitor.findByUserId(userId, options),
      Visitor.count({ ...options, userId })
    ]);
    
    const totalPages = Math.ceil(totalCount / options.limit);
    
    res.json({
      user: user.toJSON(),
      visitors,
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
    console.error('Get user visitors error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve user visitors'
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
    
    // Check if user can access this visitor
    if (!req.user.hasRole('admin') && req.user.id !== visitor.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only access visitors associated with your account'
      });
    }
    
    // Get user information
    const user = await visitor.getUser();
    
    res.json({
      visitor: visitor.toJSON(),
      user
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
    const { userId, firstName, lastName, email, phone, validFrom, validUntil } = req.body;
    
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The specified user does not exist'
      });
    }
    
    // Check if user can create visitor for this user
    if (!req.user.hasRole('admin') && req.user.id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only create visitors for your own account'
      });
    }
    
    const visitorId = await Visitor.create({
      userId,
      firstName,
      lastName,
      email,
      phone,
      validFrom,
      validUntil,
      createdBy: req.user.id
    });
    
    const visitor = await Visitor.findById(visitorId);
    
    // Log visitor creation event
    await EventLogger.logEvent(req, {
      type: 'visitor',
      action: 'created',
      entityType: 'visitor',
      entityId: visitor.id,
      entityName: `${visitor.firstName} ${visitor.lastName}`,
      details: `Visitor "${visitor.firstName} ${visitor.lastName}" created for user ${user.firstName} ${user.lastName}`,
      timestamp: new Date().toISOString()
    });
    
    res.status(201).json({
      message: 'Visitor created successfully',
      visitor: visitor.toJSON()
    });
  } catch (error) {
    console.error('Create visitor error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create visitor'
    });
  }
});

// Convenience route: create visitor for a specific user (self or admin)
router.post('/user/:userId', authenticate, async (req, res) => {
  try {
    const paramUserId = parseInt(req.params.userId);
    const { visitorName, email, phone, validFrom, validTo } = req.body;

    // Quick validation
    if (!visitorName || !validTo) {
      return res.status(400).json({ error: 'Validation Error', message: 'visitorName and validTo are required' });
    }

    const user = await User.findById(paramUserId);
    if (!user) {
      return res.status(404).json({ error: 'User not found', message: 'The specified user does not exist' });
    }

    if (!req.user.hasRole('admin') && req.user.id !== paramUserId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You can only create visitors for your own account' });
    }

    const nowIso = new Date().toISOString();
    const visitorId = await Visitor.create({
      userId: paramUserId,
      firstName: visitorName,
      lastName: '',
      email: email || null,
      phone: phone || null,
      validFrom: validFrom || nowIso,
      validUntil: validTo,
      createdBy: req.user.id
    });

    const visitor = await Visitor.findById(visitorId);
    await EventLogger.log(req, 'visitor', 'created', 'visitor', visitor.id, visitor.firstName, `Visitor added for user ${paramUserId}`);

    res.status(201).json({ message: 'Visitor created successfully', visitor: visitor.toJSON() });
  } catch (error) {
    console.error('Create visitor (user) error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create visitor' });
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
    
    // Check if user can update this visitor
    if (!req.user.hasRole('admin') && req.user.id !== visitor.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update visitors associated with your account'
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
      details: `Visitor "${visitor.firstName} ${visitor.lastName}" updated: ${changes.join(', ')}`,
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

// Delete visitor
router.delete('/:id', authenticate, validateId, async (req, res) => {
  try {
    const visitorId = parseInt(req.params.id);
    const visitor = await Visitor.findById(visitorId);
    
    if (!visitor) {
      return res.status(404).json({
        error: 'Visitor not found',
        message: 'The requested visitor does not exist'
      });
    }
    
    // Check if user can delete this visitor
    if (!req.user.hasRole('admin') && req.user.id !== visitor.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete visitors associated with your account'
      });
    }
    
    // Log visitor deletion event before deleting
    await EventLogger.logEvent(req, {
      type: 'visitor',
      action: 'deleted',
      entityType: 'visitor',
      entityId: visitor.id,
      entityName: `${visitor.firstName} ${visitor.lastName}`,
      details: `Visitor "${visitor.firstName} ${visitor.lastName}" deleted`,
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

// Get visitor statistics (admin only)
router.get('/stats/overview', authenticate, requireAdmin, async (req, res) => {
  try {
    const [totalVisitors, activeVisitors, validVisitors] = await Promise.all([
      Visitor.count({}),
      Visitor.count({ activeOnly: true }),
      Visitor.count({ validOnly: true })
    ]);
    
    res.json({
      stats: {
        totalVisitors,
        activeVisitors,
        inactiveVisitors: totalVisitors - activeVisitors,
        validVisitors,
        expiredVisitors: activeVisitors - validVisitors
      }
    });
  } catch (error) {
    console.error('Get visitor stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve visitor statistics'
    });
  }
});

module.exports = router;
const express = require('express');
const { User } = require('../database/models');
const { 
  validateUser, 
  validateUserUpdate, 
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

// Get users with their access groups (admin only) - MUST be before /:id route
router.get('/with-access-groups', authenticate, requireAdmin, async (req, res) => {
  try {
    const { role } = req.query;
    
    const options = {};
    
    if (role) {
      options.role = role;
    }
    
    const users = await User.findAll(options);
    
    // Get access groups for each user
    const usersWithAccessGroups = await Promise.all(
      users.map(async (user) => {
        try {
          const accessGroups = await user.getAccessGroups();
          return {
            ...user.toJSON(),
            accessGroups
          };
        } catch (error) {
          console.error(`Error getting access groups for user ${user.id}:`, error);
          return {
            ...user.toJSON(),
            accessGroups: []
          };
        }
      })
    );
    
    res.json({
      users: usersWithAccessGroups,
      totalCount: usersWithAccessGroups.length
    });
  } catch (error) {
    console.error('Get users with access groups error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve users with access groups'
    });
  }
});

// Get all users (admin only)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { role, search, page = 1, limit = 10 } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit)
    };
    
    if (role) {
      options.role = role;
    }
    
    if (search) {
      options.search = search;
    }
    
    const [users, totalCount] = await Promise.all([
      User.findAll(options),
      User.count(options)
    ]);
    
    const totalPages = Math.ceil(totalCount / options.limit);
    
    res.json({
      users: users.map(user => user.toJSON()),
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
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve users'
    });
  }
});

// Get user by ID
router.get('/:id', authenticate, validateId, authorizeSelfOrAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }
    
    res.json({
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve user'
    });
  }
});

// Create new user (admin only)
router.post('/', authenticate, requireAdmin, validateUser, async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'user', accessGroupId } = req.body;
    
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }
    
    // Generate username from email if not provided
    const username = email.split('@')[0];
    
    const userId = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      role
    });
    
    const user = await User.findById(userId);
    
    // If access group is specified, add the user to it
    if (accessGroupId) {
      try {
        const AccessGroup = require('../database/accessGroup');
        const accessGroup = await AccessGroup.findById(accessGroupId);
        if (accessGroup) {
          await accessGroup.addUser(userId, req.user.id);
        }
      } catch (accessGroupError) {
        console.error('Error adding user to access group:', accessGroupError);
        // Don't fail the user creation if access group assignment fails
      }
    }
    
    // Log user creation event
    await EventLogger.logUserCreated(req, user);
    
    res.status(201).json({
      message: 'User created successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Create user error:', error);
    
    if (error.message === 'Email already exists') {
      return res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create user'
    });
  }
});

// Update user
router.put('/:id', authenticate, validateId, authorizeSelfOrAdmin, validateUserUpdate, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }
    
    // Non-admin users can only update their own basic info
    if (!req.user.hasRole('admin') && req.user.id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own profile'
      });
    }
    
    // Non-admin users cannot change role or active status
    const updateData = { ...req.body };
    if (!req.user.hasRole('admin')) {
      delete updateData.role;
    }
    
    const updatedUser = await user.update(updateData);
    
    // Log user update event
    const changes = Object.keys(req.body).filter(key => req.body[key] !== undefined);
    await EventLogger.logUserUpdated(req, updatedUser, changes);
    
    res.json({
      message: 'User updated successfully',
      user: updatedUser.toJSON()
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update user'
    });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }
    
    // Prevent admin from deleting themselves
    if (req.user.id === userId) {
      return res.status(400).json({
        error: 'Cannot delete self',
        message: 'You cannot delete your own account'
      });
    }
    
    // Log user deletion event before deleting
    await EventLogger.logUserDeleted(req, user);
    
    await user.delete();
    
    res.json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete user'
    });
  }
});

// Get user statistics (admin only)
router.get('/stats/overview', authenticate, requireAdmin, async (req, res) => {
  try {
    const [totalUsers, adminUsers] = await Promise.all([
      User.count({}),
      User.count({ role: 'admin' })
    ]);
    
    // For now, assume all users are active since we don't have an is_active column
    const activeUsers = totalUsers;
    
    res.json({
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        adminUsers,
        regularUsers: totalUsers - adminUsers
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve statistics'
    });
  }
});

// Get user's access groups
router.get('/:id/access-groups', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }
    
    const accessGroups = await user.getAccessGroups();
    
    res.json({
      user: user.toJSON(),
      accessGroups
    });
  } catch (error) {
    console.error('Get user access groups error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve user access groups'
    });
  }
});

// Update user's access groups
router.put('/:id/access-groups', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { accessGroupIds } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }
    
    // Get current access groups before updating
    let currentAccessGroupNames = 'none';
    try {
      const currentAccessGroups = await user.getAccessGroups();
      console.log('Current access groups:', currentAccessGroups);
      if (currentAccessGroups && currentAccessGroups.length > 0) {
        currentAccessGroupNames = currentAccessGroups.map(ag => ag.name || 'Unknown').filter(name => name !== 'Unknown').join(', ') || 'none';
      }
    } catch (error) {
      console.log('Error getting current access groups:', error);
    }
    
    // Update user's access groups
    await user.updateAccessGroups(accessGroupIds);
    
    // Get the updated user object to ensure we have fresh data
    const updatedUser = await User.findById(userId);
    
    // Get new access groups after updating
    let newAccessGroupNames = 'none';
    try {
      const newAccessGroups = await updatedUser.getAccessGroups();
      console.log('New access groups:', newAccessGroups);
      if (newAccessGroups && newAccessGroups.length > 0) {
        newAccessGroupNames = newAccessGroups.map(ag => ag.name || 'Unknown').filter(name => name !== 'Unknown').join(', ') || 'none';
      }
    } catch (error) {
      console.log('Error getting new access groups:', error);
    }
    
    // Log user access groups update event with detailed message
    const updateMessage = `Access groups changed from "${currentAccessGroupNames}" to "${newAccessGroupNames}"`;
    await EventLogger.logEvent(req, {
      type: 'user',
      action: 'updated',
      entityType: 'user',
      entityId: user.id,
      entityName: `${user.firstName} ${user.lastName}`,
      message: updateMessage,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      message: 'User access groups updated successfully'
    });
  } catch (error) {
    console.error('Update user access groups error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update user access groups'
    });
  }
});

module.exports = router;
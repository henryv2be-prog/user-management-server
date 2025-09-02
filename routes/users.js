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

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticate, requireAdmin, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, role, isActive, search } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      role,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search
    };
    
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
    const { email, password, firstName, lastName, role = 'user' } = req.body;
    
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }
    
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role
    });
    
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
      delete updateData.isActive;
    }
    
    const updatedUser = await user.update(updateData);
    
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
    const [totalUsers, activeUsers, adminUsers, moderatorUsers] = await Promise.all([
      User.count({}),
      User.count({ isActive: true }),
      User.count({ role: 'admin' }),
      User.count({ role: 'moderator' })
    ]);
    
    res.json({
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        adminUsers,
        moderatorUsers,
        regularUsers: totalUsers - adminUsers - moderatorUsers
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

module.exports = router;


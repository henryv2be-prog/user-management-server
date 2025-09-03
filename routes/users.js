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
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { role } = req.query;
    
    const options = {};
    
    if (role) {
      options.role = role;
    }
    
    const users = await User.findAll(options);
    
    res.json({
      users: users.map(user => user.toJSON()),
      totalCount: users.length
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
    const { firstName, lastName, email, role } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }
    
    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          error: 'Email already exists',
          message: 'An account with this email already exists'
        });
      }
    }
    
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    
    await user.update(updateData);
    
    const updatedUser = await User.findById(userId);
    
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
    if (user.id === req.user.id) {
      return res.status(400).json({
        error: 'Bad Request',
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
    const stats = await User.getStats();
    
    // Get additional stats from other models
    const { Door } = require('../database/door');
    const AccessGroup = require('../database/accessGroup');
    
    const [totalDoors, totalAccessGroups] = await Promise.all([
      Door.count(),
      AccessGroup.count()
    ]);
    
    res.json({
      totalUsers: stats.total,
      activeUsers: stats.active,
      adminUsers: stats.admins,
      verifiedUsers: stats.verified,
      totalDoors,
      totalAccessGroups
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve user statistics'
    });
  }
});

module.exports = router;
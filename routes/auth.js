const express = require('express');
const { User } = require('../database/models');
const { Visitor } = require('../database/visitor');
const { validateLogin, validateRegister, validatePasswordChange } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const EventLogger = require('../utils/eventLogger');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/security');
const { AuthenticationError, ValidationError, ConflictError, asyncHandler } = require('../utils/errors');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Login endpoint
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Try to find user by email first, then by username
    let user = await User.findByEmail(email);
    if (!user) {
      user = await User.findByUsername(email);
    }
    
    // If not found as user, try as visitor
    let visitor = null;
    if (!user) {
      visitor = await Visitor.findByEmail(email);
      if (!visitor) {
        visitor = await Visitor.findByUsername(email);
      }
    }
    
    if (!user && !visitor) {
      // Log failed login attempt
      await EventLogger.logFailedLogin(req, email, 'User/Visitor not found');
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid username/email or password'
      });
    }
    
    // Check password for user or visitor
    let isValidPassword = false;
    let accountType = 'user';
    let accountData = user;
    
    if (user) {
      isValidPassword = await user.verifyPassword(password);
      accountData = user;
    } else if (visitor) {
      isValidPassword = await visitor.verifyPassword(password);
      accountType = 'visitor';
      accountData = visitor;
      
      // Check if visitor is active
      if (!visitor.isActive) {
        await EventLogger.logFailedLogin(req, email, 'Visitor account inactive');
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Account is inactive'
        });
      }
    }
    
    if (!isValidPassword) {
      // Log failed login attempt
      await EventLogger.logFailedLogin(req, email, 'Invalid password');
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: accountData.id, 
        username: accountData.username, 
        email: accountData.email, 
        role: accountType === 'visitor' ? 'visitor' : accountData.role,
        accountType: accountType,
        hostUserId: accountType === 'visitor' ? accountData.hostUserId : null
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // Log login event
    if (accountType === 'visitor') {
      await EventLogger.logEvent(req, {
        type: 'visitor',
        action: 'login',
        entityType: 'visitor',
        entityId: accountData.id,
        entityName: `${accountData.firstName} ${accountData.lastName}`,
        details: 'Visitor logged in',
        timestamp: new Date().toISOString()
      });
    } else {
      await EventLogger.logUserLogin(req, accountData);
    }
    
    res.json({
      message: 'Login successful',
      token,
      user: accountData.toJSON(),
      accountType: accountType
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Login failed'
    });
  }
});

// Register endpoint
router.post('/register', validateRegister, async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
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
      role: 'user'
    });
    
    // Log user registration event
    await EventLogger.logUserRegistration(req, user);
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.message === 'Email already exists') {
      return res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Registration failed'
    });
  }
});

// Change password endpoint
router.post('/change-password', authenticate, validatePasswordChange, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;
    
    const isValidPassword = await user.verifyPassword(currentPassword);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid password',
        message: 'Current password is incorrect'
      });
    }
    
    await user.update({ password: newPassword });
    
    // Log password change event
    await EventLogger.logPasswordChange(req, user);
    
    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Password change failed'
    });
  }
});

// Get current user profile
router.get('/me', authenticate, (req, res) => {
  res.json({
    user: req.user.toJSON()
  });
});

// Logout endpoint (client-side token removal)
router.post('/logout', authenticate, async (req, res) => {
  // Log user logout event
  await EventLogger.logUserLogout(req, req.user);
  
  res.json({
    message: 'Logout successful'
  });
});

// Verify token endpoint
router.get('/verify', authenticate, (req, res) => {
  res.json({
    valid: true,
    user: req.user.toJSON()
  });
});

module.exports = router;


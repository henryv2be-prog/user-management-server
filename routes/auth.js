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
    
    if (!user) {
      // Log failed login attempt
      await EventLogger.logFailedLogin(req, email, 'User not found');
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid username/email or password'
      });
    }
    
    // Check if non-admin user is trying to login via web interface
    const userAgent = req.headers['user-agent'] || '';
    const isWebBrowser = userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari') || userAgent.includes('Firefox');
    
    if (user.role !== 'admin' && isWebBrowser) {
      // Log failed login attempt
      await EventLogger.logFailedLogin(req, email, 'Non-admin user attempted web login');
      return res.status(403).json({
        error: 'Access denied',
        message: 'Regular users can only access the system via the mobile app. Please use the mobile app to log in.',
        code: 'WEB_ACCESS_DENIED'
      });
    }
    
    // Account is always active (is_active column removed)
    
    const isValidPassword = await user.verifyPassword(password);
    
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
        userId: user.id, 
        username: user.username, 
        email: user.email, 
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // Log user login event
    await EventLogger.logUserLogin(req, user);
    
    res.json({
      message: 'Login successful',
      token,
      user: user.toJSON()
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
    
    await user.updatePassword(newPassword);
    
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

// Unified login endpoint - automatically detects user vs visitor
router.post('/unified-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !email.trim()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email is required'
      });
    }
    
    if (!password || !password.trim()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Password is required'
      });
    }
    
    const emailLower = email.trim().toLowerCase();
    
    // First try visitor login
    try {
      const visitor = await Visitor.findByEmail(emailLower);
      
      if (visitor) {
        // Verify visitor password
        let isValidPassword = false;
        try {
          isValidPassword = await visitor.verifyPassword(password);
        } catch (passwordError) {
          console.error('Visitor password verification error:', passwordError);
          // Continue to try user login
        }
        
        if (isValidPassword && visitor.isValid()) {
          // Generate JWT token for visitor
          const token = jwt.sign(
            { 
              visitorId: visitor.id,
              userId: visitor.userId, // Host user ID
              email: visitor.email,
              accountType: 'visitor'
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
          );
          
          // Log visitor login event
          await EventLogger.log(req, 'visitor.login', 'login', 'visitor', visitor.id, `${visitor.firstName} ${visitor.lastName}`, {
            email: visitor.email,
            userId: visitor.userId
          });
          
          return res.json({
            message: 'Visitor login successful',
            token,
            accountType: 'visitor',
            user: visitor.toJSON()
          });
        }
      }
    } catch (visitorError) {
      console.log('Visitor login failed, trying user login:', visitorError.message);
    }
    
    // Try user login
    try {
      // Try to find user by email first, then by username
      let user = await User.findByEmail(emailLower);
      if (!user) {
        user = await User.findByUsername(emailLower);
      }
      
      if (user) {
        const isValidPassword = await user.verifyPassword(password);
        if (isValidPassword) {
          // Generate JWT token for user
          const token = jwt.sign(
            { 
              userId: user.id,
              email: user.email,
              username: user.username,
              accountType: 'user'
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
          );
          
          // Log user login event
          await EventLogger.log(req, 'user.login', 'login', 'user', user.id, `${user.firstName} ${user.lastName}`, {
            email: user.email,
            username: user.username
          });
          
          return res.json({
            message: 'User login successful',
            token,
            accountType: 'user',
            user: user.toJSON()
          });
        }
      }
    } catch (userError) {
      console.log('User login failed:', userError.message);
    }
    
    // If both failed, return authentication error
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid email/username or password'
    });
    
  } catch (error) {
    console.error('Unified login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Login failed'
    });
  }
});

// Door access login endpoint (for regular users and visitors via web)
router.post('/door-access-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !email.trim()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email is required'
      });
    }
    
    if (!password || !password.trim()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Password is required'
      });
    }
    
    const emailLower = email.trim().toLowerCase();
    
    // First try visitor login
    try {
      const visitor = await Visitor.findByEmail(emailLower);
      
      if (visitor) {
        // Verify visitor password
        let isValidPassword = false;
        try {
          isValidPassword = await visitor.verifyPassword(password);
        } catch (passwordError) {
          console.error('Visitor password verification error:', passwordError);
          // Continue to try user login
        }
        
        if (isValidPassword && visitor.isValid()) {
          // Generate JWT token for visitor
          const token = jwt.sign(
            { 
              visitorId: visitor.id,
              userId: visitor.userId, // Host user ID
              email: visitor.email,
              accountType: 'visitor'
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
          );
          
          // Log visitor login event
          await EventLogger.log(req, 'visitor.login', 'login', 'visitor', visitor.id, `${visitor.firstName} ${visitor.lastName}`, {
            email: visitor.email,
            userId: visitor.userId
          });
          
          return res.json({
            message: 'Visitor login successful',
            token,
            accountType: 'visitor',
            user: visitor.toJSON()
          });
        }
      }
    } catch (visitorError) {
      console.log('Visitor login failed, trying user login:', visitorError.message);
    }
    
    // Try user login
    try {
      // Try to find user by email first, then by username
      let user = await User.findByEmail(emailLower);
      if (!user) {
        user = await User.findByUsername(emailLower);
      }
      
      if (user) {
        const isValidPassword = await user.verifyPassword(password);
        if (isValidPassword) {
          // Generate JWT token for user
          const token = jwt.sign(
            { 
              userId: user.id,
              email: user.email,
              username: user.username,
              accountType: 'user'
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
          );
          
          // Log user login event
          await EventLogger.log(req, 'user.login', 'login', 'user', user.id, `${user.firstName} ${user.lastName}`, {
            email: user.email,
            username: user.username
          });
          
          return res.json({
            message: 'User login successful',
            token,
            accountType: 'user',
            user: user.toJSON()
          });
        }
      }
    } catch (userError) {
      console.log('User login failed:', userError.message);
    }
    
    // If we get here, both visitor and user login failed
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid email/username or password'
    });
    
  } catch (error) {
    console.error('Door access login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Login failed'
    });
  }
});

// Mobile app login endpoint (for regular users)
router.post('/mobile-login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Try to find user by email first, then by username
    let user = await User.findByEmail(email);
    if (!user) {
      user = await User.findByUsername(email);
    }
    
    if (!user) {
      // Log failed login attempt
      await EventLogger.logFailedLogin(req, email, 'User not found');
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid username/email or password'
      });
    }
    
    const isValidPassword = await user.verifyPassword(password);
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
        userId: user.id, 
        username: user.username, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // Log user login event
    await EventLogger.logUserLogin(req, user);
    
    res.json({
      message: 'Mobile login successful',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Mobile login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Mobile login failed'
    });
  }
});

// Get current user profile
router.get('/me', authenticate, (req, res) => {
  res.json({
    user: req.user.toJSON()
  });
});

// Get user's accessible doors (for mobile app)
router.get('/my-doors', authenticate, async (req, res) => {
  try {
    const user = req.user;
    
    // Admin users can see all doors
    if (user.role === 'admin') {
      const { Door } = require('../database/door');
      const doors = await Door.findAll();
      return res.json({
        doors: doors.map(door => door.toJSON())
      });
    }
    
    // Regular users can only see doors they have access to
    const AccessGroup = require('../database/accessGroup');
    const userAccessGroups = await AccessGroup.findByUserId(user.id);
    
    if (userAccessGroups.length === 0) {
      return res.json({
        doors: [],
        message: 'No doors accessible'
      });
    }
    
    // Get doors from user's access groups
    const { Door } = require('../database/door');
    const accessibleDoors = [];
    
    for (const accessGroup of userAccessGroups) {
      const doors = await Door.findByAccessGroupId(accessGroup.id);
      accessibleDoors.push(...doors);
    }
    
    // Remove duplicates
    const uniqueDoors = accessibleDoors.filter((door, index, self) => 
      index === self.findIndex(d => d.id === door.id)
    );
    
    res.json({
      doors: uniqueDoors.map(door => door.toJSON())
    });
  } catch (error) {
    console.error('Get user doors error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get accessible doors'
    });
  }
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


const express = require('express');
const { User } = require('../database/models');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/security');
const { authenticate } = require('../middleware/auth');
const EventLogger = require('../utils/eventLogger');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Refresh token endpoint
router.post('/refresh', authenticate, async (req, res) => {
  try {
    const user = req.user;
    
    // Generate new JWT token
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
    
    // Log token refresh event
    await EventLogger.logUserLogin(req, user, 'Token refreshed');
    
    res.json({
      message: 'Token refreshed successfully',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Token refresh failed'
    });
  }
});

module.exports = router;
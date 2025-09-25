const { User } = require('../database/models');
const { JWT_SECRET } = require('../config/security');
const { AuthenticationError } = require('../utils/errors');
const jwt = require('jsonwebtoken');

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No valid authentication token provided');
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        throw new AuthenticationError('User not found');
      }
      
      // User is always active (is_active column removed)
      
      req.user = user;
      next();
    } catch (tokenError) {
      if (tokenError.name === 'JsonWebTokenError') {
        throw new AuthenticationError('Invalid token');
      } else if (tokenError.name === 'TokenExpiredError') {
        throw new AuthenticationError('Token expired');
      }
      throw tokenError;
    }
  } catch (error) {
    next(error);
  }
};

// Authorization middleware
const authorize = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }
    
    if (!req.user.hasRole(requiredRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required role: ${requiredRole}`
      });
    }
    
    next();
  };
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (user) {
          req.user = user;
        }
      } catch (tokenError) {
        // Token is invalid, but we don't fail the request
        console.log('Invalid token in optional auth:', tokenError.message);
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    next(); // Continue even if there's an error
  }
};

// Self or admin authorization
const authorizeSelfOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }
  
  const targetUserId = parseInt(req.params.id || req.params.userId);
  
  if (req.user.id === targetUserId || req.user.hasRole('admin')) {
    next();
  } else {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You can only access your own data or need admin privileges'
    });
  }
};

// Admin only authorization
const requireAdmin = authorize('admin');

// User or higher authorization
const requireUser = authorize('user');

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  authorizeSelfOrAdmin,
  requireAdmin,
  requireUser
};
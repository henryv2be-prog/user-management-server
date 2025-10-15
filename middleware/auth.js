const { User } = require('../database/models');
const { Visitor } = require('../database/visitor');
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
      
      let account = null;
      if (decoded.accountType === 'visitor') {
        account = await Visitor.findById(decoded.visitorId);
        if (account && !account.isActive) {
          throw new AuthenticationError('Visitor account is inactive');
        }
      } else {
        account = await User.findById(decoded.userId);
      }
      
      if (!account) {
        throw new AuthenticationError('Account not found');
      }
      
      req.user = account;
      req.accountType = decoded.accountType || 'user';
      
      // Add visitor-specific fields to req.user for access requests
      if (decoded.accountType === 'visitor') {
        req.user.accountType = 'visitor';
        req.user.visitorId = decoded.visitorId;
        req.user.userId = decoded.userId; // Host user ID
      }
      
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
    
    // Handle visitor accounts
    if (req.accountType === 'visitor') {
      if (requiredRole === 'admin') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Visitors cannot access admin functions'
        });
      }
      // Visitors can access user-level functions
      next();
      return;
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
  
  // Handle visitor accounts
  if (req.accountType === 'visitor') {
    if (req.user.id === targetUserId) {
      next();
    } else {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Visitors can only access their own data'
      });
    }
    return;
  }
  
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
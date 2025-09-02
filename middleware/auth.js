const { User } = require('../database/models');

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No valid authentication token provided'
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const decoded = User.verifyToken(token);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not found'
        });
      }
      
      if (!user.isActive) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User account is deactivated'
        });
      }
      
      req.user = user;
      next();
    } catch (tokenError) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
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
        const decoded = User.verifyToken(token);
        const user = await User.findById(decoded.id);
        
        if (user && user.isActive) {
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

// Moderator or admin authorization
const requireModerator = authorize('moderator');

// User or higher authorization
const requireUser = authorize('user');

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  authorizeSelfOrAdmin,
  requireAdmin,
  requireModerator,
  requireUser
};



import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import database from '../config/database.js';
import logger from '../config/logger.js';
import { AppError } from './errorHandler.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new AppError('Access denied. No token provided.', 401);
    }

    const decoded = jwt.verify(token, config.security.jwtSecret);
    
    // Get user from database
    const user = await database.get(
      'SELECT id, username, email, first_name, last_name, role, email_verified, created_at, updated_at FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user) {
      throw new AppError('Invalid token. User not found.', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new AppError('Invalid token.', 401));
    } else if (error.name === 'TokenExpiredError') {
      next(new AppError('Token expired.', 401));
    } else {
      next(error);
    }
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new AppError('Access denied. Admin privileges required.', 403));
  }
  next();
};

export const requireUser = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Access denied. Authentication required.', 401));
  }
  next();
};

export const authorizeSelfOrAdmin = (req, res, next) => {
  const userId = parseInt(req.params.id);
  
  if (!req.user) {
    return next(new AppError('Access denied. Authentication required.', 401));
  }
  
  if (req.user.role === 'admin' || req.user.id === userId) {
    return next();
  }
  
  next(new AppError('Access denied. You can only access your own resources.', 403));
};

export const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    config.security.jwtSecret,
    { expiresIn: config.security.jwtExpiresIn }
  );
};
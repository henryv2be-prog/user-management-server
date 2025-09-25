# Critical Security Fixes for SimplifiAccess

## 1. JWT Secret Fix

### Create a secure configuration module:

```javascript
// config/security.js
const crypto = require('crypto');

// Validate JWT secret
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be set and at least 32 characters long');
  console.error('Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}

// Validate other critical settings
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;
if (BCRYPT_ROUNDS < 10) {
  console.error('WARNING: BCRYPT_ROUNDS should be at least 10 for security');
}

module.exports = {
  JWT_SECRET,
  BCRYPT_ROUNDS,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  SESSION_SECRET: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex')
};
```

## 2. Input Validation for ESP32 Heartbeat

### Add validation middleware:

```javascript
// middleware/esp32Validation.js
const { body, validationResult } = require('express-validator');

const validateHeartbeat = [
  body('deviceID').isString().trim().isLength({ min: 1, max: 100 }),
  body('deviceName').optional().isString().trim().isLength({ max: 100 }),
  body('ip').isIP(),
  body('mac').matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/),
  body('status').optional().isIn(['online', 'offline']),
  body('doorOpen').optional().isBoolean(),
  body('signal').optional().isInt({ min: -100, max: 0 }),
  body('freeHeap').optional().isInt({ min: 0 }),
  body('uptime').optional().isInt({ min: 0 }),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array() 
      });
    }
    next();
  }
];

module.exports = { validateHeartbeat };
```

## 3. Database Connection Pool

### Implement connection pooling:

```javascript
// database/pool.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabasePool {
  constructor(maxConnections = 10) {
    this.maxConnections = maxConnections;
    this.connections = [];
    this.waitingQueue = [];
    this.dbPath = process.env.DB_PATH || path.join(__dirname, 'users.db');
  }

  async getConnection() {
    // Try to find an available connection
    const available = this.connections.find(conn => !conn.inUse);
    
    if (available) {
      available.inUse = true;
      return available.db;
    }

    // Create new connection if under limit
    if (this.connections.length < this.maxConnections) {
      const db = new sqlite3.Database(this.dbPath);
      const connection = { db, inUse: true };
      this.connections.push(connection);
      return db;
    }

    // Wait for available connection
    return new Promise((resolve) => {
      this.waitingQueue.push(resolve);
    });
  }

  releaseConnection(db) {
    const connection = this.connections.find(conn => conn.db === db);
    if (connection) {
      connection.inUse = false;
      
      // Check waiting queue
      if (this.waitingQueue.length > 0) {
        const resolve = this.waitingQueue.shift();
        connection.inUse = true;
        resolve(connection.db);
      }
    }
  }

  async closeAll() {
    await Promise.all(
      this.connections.map(conn => 
        new Promise((resolve) => conn.db.close(resolve))
      )
    );
    this.connections = [];
  }
}

const pool = new DatabasePool();
module.exports = pool;
```

## 4. HTTPS Enforcement Middleware

### Add HTTPS redirect:

```javascript
// middleware/security.js
const enforceHTTPS = (req, res, next) => {
  // Skip in development
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  // Check if request is already HTTPS
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    // Add HSTS header
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    return next();
  }

  // Redirect to HTTPS
  const httpsUrl = `https://${req.headers.host}${req.url}`;
  res.redirect(301, httpsUrl);
};

// Content Security Policy
const contentSecurityPolicy = (req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' ws: wss:; " +
    "frame-ancestors 'none';"
  );
  next();
};

module.exports = { enforceHTTPS, contentSecurityPolicy };
```

## 5. Request Locking for Access Control

### Implement mutex for door access:

```javascript
// utils/accessMutex.js
class AccessMutex {
  constructor() {
    this.locks = new Map();
    this.waitQueues = new Map();
  }

  async acquire(doorId, userId) {
    const key = `door:${doorId}`;
    
    // Check if already locked
    if (this.locks.has(key)) {
      // Add to wait queue
      if (!this.waitQueues.has(key)) {
        this.waitQueues.set(key, []);
      }
      
      return new Promise((resolve) => {
        this.waitQueues.get(key).push({ userId, resolve });
      });
    }

    // Acquire lock
    this.locks.set(key, { userId, timestamp: Date.now() });
    return true;
  }

  release(doorId) {
    const key = `door:${doorId}`;
    
    // Release lock
    this.locks.delete(key);
    
    // Process wait queue
    const queue = this.waitQueues.get(key);
    if (queue && queue.length > 0) {
      const next = queue.shift();
      this.locks.set(key, { userId: next.userId, timestamp: Date.now() });
      next.resolve(true);
      
      if (queue.length === 0) {
        this.waitQueues.delete(key);
      }
    }
  }

  // Auto-release locks after timeout
  startCleanup(timeout = 30000) {
    setInterval(() => {
      const now = Date.now();
      for (const [key, lock] of this.locks.entries()) {
        if (now - lock.timestamp > timeout) {
          console.warn(`Auto-releasing stale lock for ${key}`);
          this.release(key.replace('door:', ''));
        }
      }
    }, 10000);
  }
}

const accessMutex = new AccessMutex();
accessMutex.startCleanup();

module.exports = accessMutex;
```

## 6. Environment Configuration for Mobile App

### Create dynamic configuration:

```javascript
// mobile-app/src/config/api.js
import Constants from 'expo-constants';
import * as Network from 'expo-network';

const getServerUrl = async () => {
  // Check if we're in development
  if (__DEV__) {
    // Try to auto-detect local server
    const networkState = await Network.getNetworkStateAsync();
    if (networkState.isConnected && networkState.type === Network.NetworkStateType.WIFI) {
      // Use local IP for development
      return 'http://192.168.1.20:3000';
    }
  }

  // Use environment variable or config
  return Constants.manifest?.extra?.serverUrl || 'https://api.simplifiaccess.com';
};

export default { getServerUrl };
```

## 7. Structured Error Handling

### Create error classes:

```javascript
// utils/errors.js
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  if (!(err instanceof AppError)) {
    console.error('Unexpected error:', err);
    err = new AppError('An unexpected error occurred', 500, 'UNEXPECTED_ERROR');
  }

  const response = {
    error: {
      code: err.code,
      message: err.message,
      ...(err.errors && { details: err.errors })
    }
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = err.stack;
  }

  res.status(err.statusCode).json(response);
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  errorHandler
};
```

## Implementation Priority

1. **Immediate (Today)**:
   - Fix JWT secret configuration
   - Add input validation for ESP32
   - Implement HTTPS enforcement

2. **This Week**:
   - Implement database connection pooling
   - Add request locking for access control
   - Fix mobile app configuration

3. **Next Week**:
   - Implement structured error handling
   - Add comprehensive logging
   - Set up monitoring

Remember to test all changes thoroughly in a development environment before deploying to production!
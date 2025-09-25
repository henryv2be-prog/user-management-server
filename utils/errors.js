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

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  // Log error
  console.error('Error:', {
    message: err.message,
    code: err.code,
    statusCode: err.statusCode,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Default to 500 server error
  let error = err;
  
  if (!(err instanceof AppError)) {
    // Handle specific error types
    if (err.name === 'ValidationError') {
      error = new ValidationError('Validation failed', err.errors);
    } else if (err.name === 'UnauthorizedError') {
      error = new AuthenticationError(err.message);
    } else if (err.name === 'JsonWebTokenError') {
      error = new AuthenticationError('Invalid token');
    } else if (err.name === 'TokenExpiredError') {
      error = new AuthenticationError('Token expired');
    } else {
      // Generic error
      error = new AppError(
        process.env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred' 
          : err.message,
        500,
        'UNEXPECTED_ERROR'
      );
    }
  }

  const response = {
    error: {
      code: error.code,
      message: error.message,
      ...(error.errors && { details: error.errors })
    }
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development' && error.stack) {
    response.error.stack = error.stack;
  }

  // Add request ID if available
  if (req.id) {
    response.error.requestId = req.id;
  }

  res.status(error.statusCode || 500).json(response);
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  errorHandler,
  asyncHandler
};
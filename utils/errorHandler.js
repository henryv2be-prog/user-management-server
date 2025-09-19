/**
 * Centralized Error Handling Utility
 * Provides consistent error handling across the application
 */

class ErrorHandler {
    constructor() {
        this.logger = console;
    }

    /**
     * Handle API errors
     * @param {Error} error - The error object
     * @param {Object} context - Additional context information
     * @returns {Object} Formatted error response
     */
    handleApiError(error, context = {}) {
        const errorResponse = {
            success: false,
            error: 'Internal Server Error',
            message: 'An unexpected error occurred',
            timestamp: new Date().toISOString(),
            ...context
        };

        // Log the error
        this.logger.error('API Error:', {
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString()
        });

        // Handle specific error types
        if (error.name === 'ValidationError') {
            errorResponse.error = 'Validation Error';
            errorResponse.message = error.message;
            errorResponse.statusCode = 400;
        } else if (error.name === 'UnauthorizedError') {
            errorResponse.error = 'Unauthorized';
            errorResponse.message = 'Authentication required';
            errorResponse.statusCode = 401;
        } else if (error.name === 'ForbiddenError') {
            errorResponse.error = 'Forbidden';
            errorResponse.message = 'Insufficient permissions';
            errorResponse.statusCode = 403;
        } else if (error.name === 'NotFoundError') {
            errorResponse.error = 'Not Found';
            errorResponse.message = 'Resource not found';
            errorResponse.statusCode = 404;
        } else if (error.name === 'ConflictError') {
            errorResponse.error = 'Conflict';
            errorResponse.message = 'Resource already exists';
            errorResponse.statusCode = 409;
        } else if (error.code === 'SQLITE_CONSTRAINT') {
            errorResponse.error = 'Database Constraint Error';
            errorResponse.message = 'Database constraint violation';
            errorResponse.statusCode = 400;
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            errorResponse.error = 'Connection Error';
            errorResponse.message = 'Unable to connect to external service';
            errorResponse.statusCode = 503;
        } else if (error.code === 'ETIMEDOUT') {
            errorResponse.error = 'Timeout Error';
            errorResponse.message = 'Request timeout';
            errorResponse.statusCode = 408;
        }

        return errorResponse;
    }

    /**
     * Handle client-side errors
     * @param {Error} error - The error object
     * @param {Object} context - Additional context information
     */
    handleClientError(error, context = {}) {
        // Log the error
        this.logger.error('Client Error:', {
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        });

        // Show user-friendly error message
        this.showUserError(error, context);
    }

    /**
     * Show user-friendly error message
     * @param {Error} error - The error object
     * @param {Object} context - Additional context information
     */
    showUserError(error, context = {}) {
        let message = 'An unexpected error occurred. Please try again.';

        if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
            message = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            message = 'Session expired. Please log in again.';
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
            message = 'You do not have permission to perform this action.';
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
            message = 'The requested resource was not found.';
        } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
            message = 'Server error. Please try again later.';
        }

        // Show toast notification if available
        if (window.app && window.app.showToast) {
            window.app.showToast(message, 'error');
        } else {
            alert(message);
        }
    }

    /**
     * Handle database errors
     * @param {Error} error - The error object
     * @param {Object} context - Additional context information
     * @returns {Object} Formatted error response
     */
    handleDatabaseError(error, context = {}) {
        const errorResponse = {
            success: false,
            error: 'Database Error',
            message: 'A database error occurred',
            timestamp: new Date().toISOString(),
            ...context
        };

        // Log the error
        this.logger.error('Database Error:', {
            message: error.message,
            code: error.code,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString()
        });

        // Handle specific SQLite errors
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            errorResponse.error = 'Duplicate Entry';
            errorResponse.message = 'A record with this information already exists';
        } else if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
            errorResponse.error = 'Foreign Key Constraint';
            errorResponse.message = 'Cannot delete or update due to related records';
        } else if (error.code === 'SQLITE_CONSTRAINT_NOTNULL') {
            errorResponse.error = 'Required Field Missing';
            errorResponse.message = 'A required field cannot be null';
        } else if (error.code === 'SQLITE_BUSY') {
            errorResponse.error = 'Database Busy';
            errorResponse.message = 'Database is currently in use, please try again';
        } else if (error.code === 'SQLITE_LOCKED') {
            errorResponse.error = 'Database Locked';
            errorResponse.message = 'Database is locked, please try again';
        }

        return errorResponse;
    }

    /**
     * Handle validation errors
     * @param {Array} errors - Array of validation errors
     * @param {Object} context - Additional context information
     * @returns {Object} Formatted error response
     */
    handleValidationError(errors, context = {}) {
        const errorResponse = {
            success: false,
            error: 'Validation Error',
            message: 'Please check your input and try again',
            details: errors,
            timestamp: new Date().toISOString(),
            ...context
        };

        // Log the validation errors
        this.logger.warn('Validation Error:', {
            errors,
            context,
            timestamp: new Date().toISOString()
        });

        return errorResponse;
    }

    /**
     * Handle authentication errors
     * @param {Error} error - The error object
     * @param {Object} context - Additional context information
     * @returns {Object} Formatted error response
     */
    handleAuthError(error, context = {}) {
        const errorResponse = {
            success: false,
            error: 'Authentication Error',
            message: 'Authentication failed',
            timestamp: new Date().toISOString(),
            ...context
        };

        // Log the authentication error
        this.logger.warn('Authentication Error:', {
            message: error.message,
            context,
            timestamp: new Date().toISOString()
        });

        if (error.message.includes('Invalid token') || error.message.includes('Token expired')) {
            errorResponse.error = 'Invalid Token';
            errorResponse.message = 'Your session has expired. Please log in again.';
        } else if (error.message.includes('Invalid credentials')) {
            errorResponse.error = 'Invalid Credentials';
            errorResponse.message = 'Invalid username or password';
        } else if (error.message.includes('Account locked')) {
            errorResponse.error = 'Account Locked';
            errorResponse.message = 'Your account has been locked. Please contact support.';
        }

        return errorResponse;
    }

    /**
     * Create a custom error
     * @param {string} message - Error message
     * @param {string} name - Error name
     * @param {number} statusCode - HTTP status code
     * @param {Object} context - Additional context
     * @returns {Error} Custom error object
     */
    createError(message, name = 'CustomError', statusCode = 500, context = {}) {
        const error = new Error(message);
        error.name = name;
        error.statusCode = statusCode;
        error.context = context;
        error.timestamp = new Date().toISOString();
        return error;
    }

    /**
     * Log error with context
     * @param {Error} error - The error object
     * @param {Object} context - Additional context information
     * @param {string} level - Log level (error, warn, info)
     */
    logError(error, context = {}, level = 'error') {
        const logData = {
            message: error.message,
            name: error.name,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString(),
            level
        };

        this.logger[level]('Application Error:', logData);
    }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

// Export both class and instance
module.exports = {
    ErrorHandler,
    errorHandler
};
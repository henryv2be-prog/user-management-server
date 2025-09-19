/**
 * Security Utilities
 * Provides security-related functions and middleware
 */

const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

class SecurityUtils {
    /**
     * Generate a secure random string
     * @param {number} length - Length of the string
     * @returns {string} Random string
     */
    static generateSecureToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Hash a string using SHA-256
     * @param {string} input - String to hash
     * @returns {string} Hashed string
     */
    static hashString(input) {
        return crypto.createHash('sha256').update(input).digest('hex');
    }

    /**
     * Generate a secure password
     * @param {number} length - Length of the password
     * @returns {string} Secure password
     */
    static generateSecurePassword(length = 16) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
    }

    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {Object} Validation result
     */
    static validatePasswordStrength(password) {
        const result = {
            isValid: true,
            errors: [],
            score: 0
        };

        if (password.length < 8) {
            result.errors.push('Password must be at least 8 characters long');
            result.isValid = false;
        }

        if (!/[A-Z]/.test(password)) {
            result.errors.push('Password must contain at least one uppercase letter');
            result.isValid = false;
        }

        if (!/[a-z]/.test(password)) {
            result.errors.push('Password must contain at least one lowercase letter');
            result.isValid = false;
        }

        if (!/[0-9]/.test(password)) {
            result.errors.push('Password must contain at least one number');
            result.isValid = false;
        }

        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            result.errors.push('Password must contain at least one special character');
            result.isValid = false;
        }

        // Calculate score
        if (password.length >= 8) result.score += 1;
        if (password.length >= 12) result.score += 1;
        if (/[A-Z]/.test(password)) result.score += 1;
        if (/[a-z]/.test(password)) result.score += 1;
        if (/[0-9]/.test(password)) result.score += 1;
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) result.score += 1;
        if (password.length >= 16) result.score += 1;

        return result;
    }

    /**
     * Sanitize input string
     * @param {string} input - Input to sanitize
     * @returns {string} Sanitized input
     */
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .trim()
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .replace(/['"]/g, '') // Remove quotes
            .replace(/[;]/g, '') // Remove semicolons
            .replace(/[()]/g, '') // Remove parentheses
            .substring(0, 1000); // Limit length
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} Is valid email
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate IP address
     * @param {string} ip - IP address to validate
     * @returns {boolean} Is valid IP
     */
    static isValidIP(ip) {
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    }

    /**
     * Check if string contains SQL injection patterns
     * @param {string} input - Input to check
     * @returns {boolean} Contains SQL injection
     */
    static containsSQLInjection(input) {
        const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
            /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
            /(\b(OR|AND)\s+['"]\w+['"]\s*=\s*['"]\w+['"])/i,
            /(UNION\s+SELECT)/i,
            /(DROP\s+TABLE)/i,
            /(INSERT\s+INTO)/i,
            /(UPDATE\s+SET)/i,
            /(DELETE\s+FROM)/i
        ];

        return sqlPatterns.some(pattern => pattern.test(input));
    }

    /**
     * Check if string contains XSS patterns
     * @param {string} input - Input to check
     * @returns {boolean} Contains XSS
     */
    static containsXSS(input) {
        const xssPatterns = [
            /<script[^>]*>.*?<\/script>/gi,
            /<iframe[^>]*>.*?<\/iframe>/gi,
            /<object[^>]*>.*?<\/object>/gi,
            /<embed[^>]*>.*?<\/embed>/gi,
            /<link[^>]*>.*?<\/link>/gi,
            /<meta[^>]*>.*?<\/meta>/gi,
            /<style[^>]*>.*?<\/style>/gi,
            /javascript:/gi,
            /vbscript:/gi,
            /onload\s*=/gi,
            /onerror\s*=/gi,
            /onclick\s*=/gi,
            /onmouseover\s*=/gi
        ];

        return xssPatterns.some(pattern => pattern.test(input));
    }

    /**
     * Create rate limiter middleware
     * @param {Object} options - Rate limit options
     * @returns {Function} Rate limiter middleware
     */
    static createRateLimiter(options = {}) {
        const defaultOptions = {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: 'Too many requests from this IP, please try again later.',
            standardHeaders: true,
            legacyHeaders: false,
            ...options
        };

        return rateLimit(defaultOptions);
    }

    /**
     * Create strict rate limiter for sensitive endpoints
     * @param {Object} options - Rate limit options
     * @returns {Function} Strict rate limiter middleware
     */
    static createStrictRateLimiter(options = {}) {
        const defaultOptions = {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 5, // limit each IP to 5 requests per windowMs
            message: 'Too many attempts, please try again later.',
            standardHeaders: true,
            legacyHeaders: false,
            ...options
        };

        return rateLimit(defaultOptions);
    }

    /**
     * Generate CSRF token
     * @returns {string} CSRF token
     */
    static generateCSRFToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Verify CSRF token
     * @param {string} token - Token to verify
     * @param {string} sessionToken - Session token
     * @returns {boolean} Is valid token
     */
    static verifyCSRFToken(token, sessionToken) {
        return token && sessionToken && token === sessionToken;
    }

    /**
     * Check if request is from a trusted source
     * @param {Object} req - Express request object
     * @returns {boolean} Is trusted source
     */
    static isTrustedSource(req) {
        const trustedIPs = process.env.TRUSTED_IPS ? process.env.TRUSTED_IPS.split(',') : [];
        const clientIP = req.ip || req.connection.remoteAddress;
        
        return trustedIPs.includes(clientIP);
    }

    /**
     * Validate request headers
     * @param {Object} req - Express request object
     * @returns {Object} Validation result
     */
    static validateHeaders(req) {
        const result = {
            isValid: true,
            errors: []
        };

        // Check for required headers
        const requiredHeaders = ['user-agent'];
        requiredHeaders.forEach(header => {
            if (!req.headers[header]) {
                result.errors.push(`Missing required header: ${header}`);
                result.isValid = false;
            }
        });

        // Check for suspicious headers
        const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip'];
        suspiciousHeaders.forEach(header => {
            if (req.headers[header] && !this.isValidIP(req.headers[header])) {
                result.errors.push(`Invalid IP in header: ${header}`);
                result.isValid = false;
            }
        });

        return result;
    }

    /**
     * Log security event
     * @param {string} event - Event type
     * @param {Object} details - Event details
     * @param {Object} req - Express request object
     */
    static logSecurityEvent(event, details, req) {
        const logData = {
            event,
            details,
            timestamp: new Date().toISOString(),
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            url: req.originalUrl,
            method: req.method
        };

        console.warn('Security Event:', logData);
    }
}

module.exports = SecurityUtils;
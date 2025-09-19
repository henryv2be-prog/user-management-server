/**
 * Caching Utility
 * Provides in-memory caching functionality with TTL support
 */

class Cache {
    constructor() {
        this.cache = new Map();
        this.timers = new Map();
    }

    /**
     * Set a cache entry with TTL
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {number} ttl - Time to live in milliseconds
     */
    set(key, value, ttl = 300000) { // Default 5 minutes
        // Clear existing timer if any
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
        }

        // Set the cache entry
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            ttl
        });

        // Set timer to remove entry after TTL
        const timer = setTimeout(() => {
            this.delete(key);
        }, ttl);

        this.timers.set(key, timer);
    }

    /**
     * Get a cache entry
     * @param {string} key - Cache key
     * @returns {*} Cached value or undefined
     */
    get(key) {
        const entry = this.cache.get(key);
        
        if (!entry) {
            return undefined;
        }

        // Check if entry has expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.delete(key);
            return undefined;
        }

        return entry.value;
    }

    /**
     * Check if a key exists in cache
     * @param {string} key - Cache key
     * @returns {boolean} True if key exists and not expired
     */
    has(key) {
        const entry = this.cache.get(key);
        
        if (!entry) {
            return false;
        }

        // Check if entry has expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.delete(key);
            return false;
        }

        return true;
    }

    /**
     * Delete a cache entry
     * @param {string} key - Cache key
     * @returns {boolean} True if key was deleted
     */
    delete(key) {
        // Clear timer
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
            this.timers.delete(key);
        }

        return this.cache.delete(key);
    }

    /**
     * Clear all cache entries
     */
    clear() {
        // Clear all timers
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers.clear();
        
        // Clear cache
        this.cache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getStats() {
        const now = Date.now();
        let expired = 0;
        let active = 0;

        this.cache.forEach(entry => {
            if (now - entry.timestamp > entry.ttl) {
                expired++;
            } else {
                active++;
            }
        });

        return {
            total: this.cache.size,
            active,
            expired,
            memoryUsage: process.memoryUsage()
        };
    }

    /**
     * Clean up expired entries
     * @returns {number} Number of entries cleaned
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.delete(key);
                cleaned++;
            }
        }

        return cleaned;
    }
}

// Create singleton instance
const cache = new Cache();

// Cleanup expired entries every 5 minutes
setInterval(() => {
    const cleaned = cache.cleanup();
    if (cleaned > 0) {
        console.log(`Cache cleanup: removed ${cleaned} expired entries`);
    }
}, 300000);

/**
 * Cache middleware for Express
 * @param {number} ttl - Time to live in milliseconds
 * @param {Function} keyGenerator - Function to generate cache key from request
 * @returns {Function} Express middleware
 */
function cacheMiddleware(ttl = 300000, keyGenerator = null) {
    return (req, res, next) => {
        // Generate cache key
        const key = keyGenerator ? keyGenerator(req) : `cache:${req.method}:${req.originalUrl}`;
        
        // Check if response is cached
        const cached = cache.get(key);
        if (cached) {
            return res.json(cached);
        }

        // Store original res.json
        const originalJson = res.json.bind(res);
        
        // Override res.json to cache the response
        res.json = function(data) {
            // Only cache successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                cache.set(key, data, ttl);
            }
            return originalJson(data);
        };

        next();
    };
}

/**
 * Cache decorator for functions
 * @param {number} ttl - Time to live in milliseconds
 * @param {Function} keyGenerator - Function to generate cache key from arguments
 * @returns {Function} Decorated function
 */
function cacheFunction(ttl = 300000, keyGenerator = null) {
    return function(target, propertyName, descriptor) {
        const method = descriptor.value;
        
        descriptor.value = function(...args) {
            // Generate cache key
            const key = keyGenerator ? keyGenerator(...args) : `func:${propertyName}:${JSON.stringify(args)}`;
            
            // Check cache
            const cached = cache.get(key);
            if (cached) {
                return Promise.resolve(cached);
            }

            // Execute original function
            const result = method.apply(this, args);
            
            // Cache the result if it's a promise
            if (result && typeof result.then === 'function') {
                return result.then(data => {
                    cache.set(key, data, ttl);
                    return data;
                });
            } else {
                cache.set(key, result, ttl);
                return result;
            }
        };
    };
}

module.exports = {
    Cache,
    cache,
    cacheMiddleware,
    cacheFunction
};
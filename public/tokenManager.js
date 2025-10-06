/**
 * Token Management Utility
 * Handles automatic token refresh and validation
 */

class TokenManager {
    constructor() {
        this.refreshInterval = null;
        this.refreshThreshold = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        this.checkInterval = 60 * 60 * 1000; // Check every hour
        this.isRefreshing = false;
    }

    /**
     * Start automatic token refresh monitoring
     */
    start() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // Check token status every hour
        this.refreshInterval = setInterval(() => {
            this.checkAndRefreshToken();
        }, this.checkInterval);

        // Also check immediately
        this.checkAndRefreshToken();

        console.log('🔄 Token manager started');
    }

    /**
     * Stop automatic token refresh monitoring
     */
    stop() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        console.log('🔄 Token manager stopped');
    }

    /**
     * Check if token needs refresh and refresh if necessary
     */
    async checkAndRefreshToken() {
        const token = localStorage.getItem('token');
        if (!token) {
            return false;
        }

        try {
            // Decode token to check expiration
            const payload = this.decodeToken(token);
            if (!payload) {
                return false;
            }

            const now = Date.now();
            const exp = payload.exp * 1000; // Convert to milliseconds
            const timeUntilExpiry = exp - now;

            // If token expires within 24 hours, refresh it
            if (timeUntilExpiry < this.refreshThreshold && timeUntilExpiry > 0) {
                console.log('🔄 Token expires soon, refreshing...');
                return await this.refreshToken();
            }

            return true;
        } catch (error) {
            console.error('Error checking token:', error);
            return false;
        }
    }

    /**
     * Refresh the current token
     */
    async refreshToken() {
        if (this.isRefreshing) {
            console.log('🔄 Token refresh already in progress');
            return false;
        }

        this.isRefreshing = true;

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                return false;
            }

            const response = await fetch('/api/token/refresh', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('token', data.token);
                console.log('✅ Token refreshed successfully');
                return true;
            } else {
                console.error('❌ Token refresh failed:', response.status);
                // If refresh fails, user might need to login again
                this.handleTokenRefreshFailure();
                return false;
            }
        } catch (error) {
            console.error('❌ Token refresh error:', error);
            this.handleTokenRefreshFailure();
            return false;
        } finally {
            this.isRefreshing = false;
        }
    }

    /**
     * Handle token refresh failure
     */
    handleTokenRefreshFailure() {
        console.log('🔄 Token refresh failed, user will need to login again');
        // Don't automatically logout, let the user continue until their next API call
        // The API call will fail and then they'll be redirected to login
    }

    /**
     * Decode JWT token without verification (for checking expiration)
     */
    decodeToken(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Error decoding token:', error);
            return null;
        }
    }

    /**
     * Check if token is valid and not expired
     */
    isTokenValid() {
        const token = localStorage.getItem('token');
        if (!token) {
            return false;
        }

        try {
            const payload = this.decodeToken(token);
            if (!payload) {
                return false;
            }

            const now = Date.now();
            const exp = payload.exp * 1000;
            return exp > now;
        } catch (error) {
            console.error('Error validating token:', error);
            return false;
        }
    }

    /**
     * Get token with automatic refresh if needed
     */
    async getValidToken() {
        const isValid = this.isTokenValid();
        if (!isValid) {
            return null;
        }

        // Check if token needs refresh
        await this.checkAndRefreshToken();
        return localStorage.getItem('token');
    }
}

// Create global instance
window.tokenManager = new TokenManager();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TokenManager;
}
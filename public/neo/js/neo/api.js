/**
 * SimplifiAccess Neo - API Layer
 * Modern API client with caching, retry logic, and real-time updates
 */

class NeoAPI {
    constructor() {
        this.baseURL = '/api';
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        this.requestQueue = new Map();
        this.sseConnection = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    // Core request method with caching and retry logic
    async request(endpoint, options = {}) {
        const {
            method = 'GET',
            body = null,
            headers = {},
            cache = true,
            retry = true,
            timeout = 10000
        } = options;

        const cacheKey = `${method}:${endpoint}:${JSON.stringify(body)}`;
        
        // Check cache first
        if (cache && method === 'GET') {
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }
        }

        // Check if request is already in progress
        if (this.requestQueue.has(cacheKey)) {
            return this.requestQueue.get(cacheKey);
        }

        // Create request promise
        const requestPromise = this.makeRequest(endpoint, {
            method,
            body,
            headers,
            timeout,
            retry
        });

        // Store in queue
        this.requestQueue.set(cacheKey, requestPromise);

        try {
            const result = await requestPromise;
            
            // Cache successful GET requests
            if (cache && method === 'GET' && result.success !== false) {
                this.setCache(cacheKey, result);
            }
            
            return result;
        } finally {
            // Remove from queue
            this.requestQueue.delete(cacheKey);
        }
    }

    async makeRequest(endpoint, options = {}) {
        const {
            method = 'GET',
            body = null,
            headers = {},
            timeout = 10000,
            retry = true
        } = options;

        const url = `${this.baseURL}${endpoint}`;
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...this.getAuthHeaders(),
                ...headers
            },
            signal: AbortSignal.timeout(timeout)
        };

        if (body) {
            config.body = JSON.stringify(body);
        }

        let lastError;
        
        for (let attempt = 1; attempt <= (retry ? this.retryAttempts : 1); attempt++) {
            try {
                const response = await fetch(url, config);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                // Reset reconnect attempts on successful request
                this.reconnectAttempts = 0;
                
                return data;
            } catch (error) {
                lastError = error;
                
                if (attempt < this.retryAttempts) {
                    console.warn(`Request attempt ${attempt} failed:`, error.message);
                    await Utils.sleep(this.retryDelay * attempt);
                }
            }
        }
        
        throw lastError;
    }

    // Authentication methods
    getAuthHeaders() {
        const token = StorageUtils.get('authToken');
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    async login(credentials) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: credentials,
            cache: false
        });

        if (response.token) {
            StorageUtils.set('authToken', response.token, true);
            StorageUtils.set('user', response.user);
        }

        return response;
    }

    async logout() {
        try {
            await this.request('/auth/logout', {
                method: 'POST',
                cache: false
            });
        } finally {
            StorageUtils.remove('authToken');
            StorageUtils.remove('user');
            this.disconnectSSE();
        }
    }

    async getCurrentUser() {
        return await this.request('/auth/me');
    }

    // Door management
    async getDoors() {
        return await this.request('/doors');
    }

    async getDoor(id) {
        return await this.request(`/doors/${id}`);
    }

    async createDoor(doorData) {
        return await this.request('/doors', {
            method: 'POST',
            body: doorData,
            cache: false
        });
    }

    async updateDoor(id, doorData) {
        return await this.request(`/doors/${id}`, {
            method: 'PUT',
            body: doorData,
            cache: false
        });
    }

    async deleteDoor(id) {
        return await this.request(`/doors/${id}`, {
            method: 'DELETE',
            cache: false
        });
    }

    async controlDoor(id, action) {
        return await this.request(`/doors/${id}/control`, {
            method: 'POST',
            body: { action },
            cache: false
        });
    }

    // User management
    async getUsers() {
        return await this.request('/users');
    }

    async getUser(id) {
        return await this.request(`/users/${id}`);
    }

    async createUser(userData) {
        return await this.request('/users', {
            method: 'POST',
            body: userData,
            cache: false
        });
    }

    async updateUser(id, userData) {
        return await this.request(`/users/${id}`, {
            method: 'PUT',
            body: userData,
            cache: false
        });
    }

    async deleteUser(id) {
        return await this.request(`/users/${id}`, {
            method: 'DELETE',
            cache: false
        });
    }

    // Events
    async getEvents(options = {}) {
        const params = new URLSearchParams(options);
        return await this.request(`/events?${params}`);
    }

    async getEvent(id) {
        return await this.request(`/events/${id}`);
    }

    // Access Groups
    async getAccessGroups() {
        return await this.request('/access-groups');
    }

    async getAccessGroup(id) {
        return await this.request(`/access-groups/${id}`);
    }

    async createAccessGroup(groupData) {
        return await this.request('/access-groups', {
            method: 'POST',
            body: groupData,
            cache: false
        });
    }

    async updateAccessGroup(id, groupData) {
        return await this.request(`/access-groups/${id}`, {
            method: 'PUT',
            body: groupData,
            cache: false
        });
    }

    async deleteAccessGroup(id) {
        return await this.request(`/access-groups/${id}`, {
            method: 'DELETE',
            cache: false
        });
    }

    // System health
    async getHealth() {
        return await this.request('/health');
    }

    async getStats() {
        return await this.request('/stats');
    }

    // Real-time updates via Server-Sent Events
    connectSSE() {
        if (this.sseConnection) {
            return;
        }

        const token = StorageUtils.get('authToken');
        if (!token) {
            return;
        }

        const url = new URL('/api/events/stream', window.location.origin);
        url.searchParams.set('token', token);

        this.sseConnection = new EventSource(url.toString());

        this.sseConnection.onopen = () => {
            console.log('SSE connection opened');
            this.reconnectAttempts = 0;
            eventBus.emit('sseConnected');
        };

        this.sseConnection.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleSSEMessage(data);
            } catch (error) {
                console.error('Error parsing SSE message:', error);
            }
        };

        this.sseConnection.onerror = (error) => {
            console.error('SSE connection error:', error);
            this.handleSSEError();
        };

        this.sseConnection.onclose = () => {
            console.log('SSE connection closed');
            this.handleSSEClose();
        };
    }

    disconnectSSE() {
        if (this.sseConnection) {
            this.sseConnection.close();
            this.sseConnection = null;
        }
    }

    handleSSEMessage(data) {
        const { type, payload } = data;
        
        switch (type) {
            case 'door_status':
                this.handleDoorStatusUpdate(payload);
                break;
            case 'user_activity':
                this.handleUserActivityUpdate(payload);
                break;
            case 'system_event':
                this.handleSystemEvent(payload);
                break;
            case 'notification':
                this.handleNotification(payload);
                break;
            default:
                console.log('Unknown SSE message type:', type);
        }
    }

    handleDoorStatusUpdate(payload) {
        // Update door status in cache
        const doors = this.cache.get('GET:/doors') || [];
        const doorIndex = doors.findIndex(door => door.id === payload.id);
        
        if (doorIndex !== -1) {
            doors[doorIndex] = { ...doors[doorIndex], ...payload };
            this.setCache('GET:/doors', doors);
        }

        // Emit event for UI updates
        eventBus.emit('doorStatusUpdate', payload);
    }

    handleUserActivityUpdate(payload) {
        eventBus.emit('userActivityUpdate', payload);
    }

    handleSystemEvent(payload) {
        eventBus.emit('systemEvent', payload);
        
        // Show notification
        eventBus.emit('toast', {
            type: payload.level || 'info',
            message: payload.message
        });
    }

    handleNotification(payload) {
        eventBus.emit('notification', payload);
    }

    handleSSEError() {
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts <= this.maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            console.log(`Reconnecting SSE in ${delay}ms (attempt ${this.reconnectAttempts})`);
            
            setTimeout(() => {
                this.disconnectSSE();
                this.connectSSE();
            }, delay);
        } else {
            console.error('Max SSE reconnection attempts reached');
            eventBus.emit('sseDisconnected');
        }
    }

    handleSSEClose() {
        // Attempt to reconnect after a delay
        setTimeout(() => {
            if (!this.sseConnection) {
                this.connectSSE();
            }
        }, 5000);
    }

    // Cache management
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
    }

    // Utility methods
    async uploadFile(file, endpoint = '/upload') {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        return await response.json();
    }

    async downloadFile(endpoint, filename) {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            headers: this.getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error(`Download failed: ${response.statusText}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Batch operations
    async batchRequest(requests) {
        const promises = requests.map(request => 
            this.request(request.endpoint, request.options)
        );
        
        return await Promise.allSettled(promises);
    }

    // Health check
    async healthCheck() {
        try {
            const health = await this.getHealth();
            return {
                status: 'healthy',
                data: health
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }
}

// Create global API instance
const neoAPI = new NeoAPI();

// Export for use in other modules
window.NeoAPI = NeoAPI;
window.neoAPI = neoAPI;
/**
 * SimplifiAccess Neo - Core System
 * Modern, component-based architecture with advanced features
 */

// Core Application State Management
class NeoState {
    constructor() {
        this.state = {
            user: null,
            theme: 'dark',
            sidebarCollapsed: false,
            currentSection: 'dashboard',
            notifications: [],
            commandPaletteOpen: false,
            notificationsOpen: false,
            loading: true,
            online: navigator.onLine,
            data: {
                doors: [],
                users: [],
                events: [],
                accessGroups: [],
                stats: {}
            }
        };
        this.listeners = new Map();
        this.middleware = [];
    }

    // State management
    getState() {
        return { ...this.state };
    }

    setState(newState) {
        const prevState = { ...this.state };
        this.state = { ...this.state, ...newState };
        this.notifyListeners(prevState, this.state);
    }

    // Middleware system
    use(middleware) {
        this.middleware.push(middleware);
    }

    // Event system
    subscribe(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    unsubscribe(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => callback(data));
        }
    }

    // Notify state change listeners
    notifyListeners(prevState, newState) {
        this.middleware.forEach(middleware => {
            middleware(prevState, newState);
        });
        
        this.emit('stateChange', { prevState, newState });
    }
}

// Global state instance
const neoState = new NeoState();

// Component Base Class
class NeoComponent {
    constructor(element, props = {}) {
        this.element = element;
        this.props = props;
        this.state = {};
        this.children = new Map();
        this.eventListeners = new Map();
        this.rendered = false;
    }

    // Lifecycle methods
    async mount() {
        this.beforeMount();
        await this.render();
        this.afterMount();
    }

    async unmount() {
        this.beforeUnmount();
        this.cleanup();
        this.afterUnmount();
    }

    async update(newProps = {}) {
        this.props = { ...this.props, ...newProps };
        this.beforeUpdate();
        await this.render();
        this.afterUpdate();
    }

    // Override these in subclasses
    beforeMount() {}
    afterMount() {}
    beforeUpdate() {}
    afterUpdate() {}
    beforeUnmount() {}
    afterUnmount() {}

    // Template method - override in subclasses
    async render() {
        throw new Error('render() method must be implemented');
    }

    // Event handling
    addEventListener(event, handler) {
        this.element.addEventListener(event, handler);
        this.eventListeners.set(event, handler);
    }

    removeEventListener(event) {
        if (this.eventListeners.has(event)) {
            this.element.removeEventListener(event, this.eventListeners.get(event));
            this.eventListeners.delete(event);
        }
    }

    // Child component management
    addChild(key, component) {
        this.children.set(key, component);
    }

    removeChild(key) {
        if (this.children.has(key)) {
            this.children.get(key).unmount();
            this.children.delete(key);
        }
    }

    // Cleanup
    cleanup() {
        this.eventListeners.forEach((handler, event) => {
            this.element.removeEventListener(event, handler);
        });
        this.eventListeners.clear();
        
        this.children.forEach(child => child.unmount());
        this.children.clear();
    }

    // Utility methods
    querySelector(selector) {
        return this.element.querySelector(selector);
    }

    querySelectorAll(selector) {
        return this.element.querySelectorAll(selector);
    }

    setAttribute(name, value) {
        this.element.setAttribute(name, value);
    }

    getAttribute(name) {
        return this.element.getAttribute(name);
    }

    addClass(className) {
        this.element.classList.add(className);
    }

    removeClass(className) {
        this.element.classList.remove(className);
    }

    toggleClass(className) {
        this.element.classList.toggle(className);
    }

    hasClass(className) {
        return this.element.classList.contains(className);
    }
}

// Event Bus for component communication
class EventBus {
    constructor() {
        this.events = new Map();
    }

    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
    }

    off(event, callback) {
        if (this.events.has(event)) {
            const callbacks = this.events.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(callback => callback(data));
        }
    }

    once(event, callback) {
        const onceCallback = (data) => {
            callback(data);
            this.off(event, onceCallback);
        };
        this.on(event, onceCallback);
    }
}

// Global event bus
const eventBus = new EventBus();

// Animation utilities
class AnimationUtils {
    static async fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        return new Promise(resolve => {
            const start = performance.now();
            
            const animate = (currentTime) => {
                const elapsed = currentTime - start;
                const progress = Math.min(elapsed / duration, 1);
                
                element.style.opacity = progress;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }

    static async fadeOut(element, duration = 300) {
        return new Promise(resolve => {
            const start = performance.now();
            
            const animate = (currentTime) => {
                const elapsed = currentTime - start;
                const progress = Math.min(elapsed / duration, 1);
                
                element.style.opacity = 1 - progress;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    element.style.display = 'none';
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }

    static async slideIn(element, direction = 'up', duration = 300) {
        const transform = {
            up: 'translateY(20px)',
            down: 'translateY(-20px)',
            left: 'translateX(20px)',
            right: 'translateX(-20px)'
        };

        element.style.transform = transform[direction];
        element.style.opacity = '0';
        element.style.display = 'block';
        
        return new Promise(resolve => {
            const start = performance.now();
            
            const animate = (currentTime) => {
                const elapsed = currentTime - start;
                const progress = Math.min(elapsed / duration, 1);
                
                element.style.opacity = progress;
                element.style.transform = `translateY(${20 * (1 - progress)}px)`;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    element.style.transform = 'translateY(0)';
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }
}

// Storage utilities with encryption
class StorageUtils {
    static set(key, value, encrypt = false) {
        try {
            const data = encrypt ? this.encrypt(JSON.stringify(value)) : JSON.stringify(value);
            localStorage.setItem(key, data);
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            return false;
        }
    }

    static get(key, decrypt = false) {
        try {
            const data = localStorage.getItem(key);
            if (!data) return null;
            
            const parsed = decrypt ? JSON.parse(this.decrypt(data)) : JSON.parse(data);
            return parsed;
        } catch (error) {
            console.error('Storage get error:', error);
            return null;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Storage remove error:', error);
            return false;
        }
    }

    static clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    }

    // Simple encryption (for demo purposes)
    static encrypt(text) {
        return btoa(text);
    }

    static decrypt(encrypted) {
        return atob(encrypted);
    }
}

// Performance monitoring
class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.observers = [];
    }

    startTiming(name) {
        this.metrics.set(name, performance.now());
    }

    endTiming(name) {
        const startTime = this.metrics.get(name);
        if (startTime) {
            const duration = performance.now() - startTime;
            this.metrics.delete(name);
            this.emit('timing', { name, duration });
            return duration;
        }
        return null;
    }

    measureMemory() {
        if (performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    }

    measurePaint() {
        return new Promise(resolve => {
            const observer = new PerformanceObserver(list => {
                const entries = list.getEntries();
                resolve(entries);
            });
            
            observer.observe({ entryTypes: ['paint'] });
            this.observers.push(observer);
        });
    }

    cleanup() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
    }
}

// Global performance monitor
const performanceMonitor = new PerformanceMonitor();

// Error handling and logging
class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 100;
    }

    handle(error, context = {}) {
        const errorInfo = {
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        this.errors.push(errorInfo);
        
        // Keep only the last maxErrors
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }

        // Emit error event
        eventBus.emit('error', errorInfo);

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('Error:', errorInfo);
        }
    }

    getErrors() {
        return [...this.errors];
    }

    clearErrors() {
        this.errors = [];
    }
}

// Global error handler
const errorHandler = new ErrorHandler();

// Set up global error handling
window.addEventListener('error', (event) => {
    errorHandler.handle(event.error, { type: 'javascript' });
});

window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handle(new Error(event.reason), { type: 'promise' });
});

// Utility functions
const Utils = {
    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Generate unique ID
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    },

    // Format date
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options });
    },

    // Format relative time
    formatRelativeTime(date) {
        const now = new Date();
        const diff = now - new Date(date);
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    },

    // Copy to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('Copy failed:', error);
            return false;
        }
    },

    // Download file
    downloadFile(content, filename, type = 'text/plain') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Validate email
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // Validate URL
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    },

    // Sleep function
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// Export for use in other modules
window.NeoState = NeoState;
window.NeoComponent = NeoComponent;
window.EventBus = EventBus;
window.AnimationUtils = AnimationUtils;
window.StorageUtils = StorageUtils;
window.PerformanceMonitor = PerformanceMonitor;
window.ErrorHandler = ErrorHandler;
window.Utils = Utils;
window.neoState = neoState;
window.eventBus = eventBus;
window.performanceMonitor = performanceMonitor;
window.errorHandler = errorHandler;
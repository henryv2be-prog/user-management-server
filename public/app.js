// Enhanced cache-busting helper function
function addCacheBusting(url) {
    const separator = url.includes('?') ? '&' : '?';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${url}${separator}_cb=${timestamp}&_r=${random}&_v=${Math.floor(timestamp / 1000)}`;
}

// Force refresh helper - ensures fresh data from server
function forceRefresh(url, options = {}) {
    const cacheBustedUrl = addCacheBusting(url);
    const enhancedOptions = {
        ...options,
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            ...options.headers
        }
    };
    return fetch(cacheBustedUrl, enhancedOptions);
}

// Global function to force refresh all critical data
async function forceRefreshAllData() {
    console.log('🔄 Force refreshing all critical data...');
    
    try {
        // Refresh site map data
        if (typeof loadDashboard === 'function') {
            await loadDashboard();
        }
        
        // Refresh doors data
        if (typeof loadDoors === 'function') {
            await loadDoors(1);
        }
        
        // Refresh users data
        if (typeof loadUsers === 'function') {
            await loadUsers(1);
        }
        
        // Refresh access groups data
        if (typeof loadAccessGroups === 'function') {
            await loadAccessGroups(1);
        }
        
        console.log('✅ All critical data refreshed successfully');
        app.showNotification('All data refreshed from server', 'success');
    } catch (error) {
        console.error('❌ Error refreshing data:', error);
        app.showNotification('Error refreshing data', 'error');
    }
}

// Modern ES6+ Application State Management
class AppState {
    constructor() {
        this.currentUser = null;
        this.currentPage = 1;
        this.currentFilters = {};
        this.currentSection = 'dashboard';
        this.isOnline = navigator.onLine;
        this.eventListeners = new Map();
    }

    // State management methods
    setUser(user) {
        this.currentUser = user;
        this.notifyStateChange('user', user);
    }

    setSection(section) {
        this.currentSection = section;
        this.notifyStateChange('section', section);
    }

    setOnlineStatus(isOnline) {
        this.isOnline = isOnline;
        this.notifyStateChange('online', isOnline);
    }

    // Observer pattern for state changes
    subscribe(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    notifyStateChange(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => callback(data));
        }
    }
}

// Global app state
const appState = new AppState();

// Modern Application Class
class SimplifiAccessApp {
    constructor() {
        this.apiBase = '/api';
        this.retryAttempts = 3;
        this.retryDelay = 1000;
    }

    // Initialize the application
    async init() {
        try {
            await this.checkAuthStatus();
            this.setupEventListeners();
            this.setupOnlineStatusListener();
            this.setupKeyboardNavigation();
            console.log('✅ SimplifiAccess app initialized successfully');
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.showError('Failed to initialize application');
        }
    }

    // Modern async/await error handling
    async makeRequest(url, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Get valid token with automatic refresh
        const token = await this.getValidToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await fetch(`${this.apiBase}${url}`, config);
                
                // Handle token expiration
                if (response.status === 401) {
                    console.log('🔄 Token expired, attempting refresh...');
                    const refreshed = await this.refreshTokenIfNeeded();
                    if (refreshed && attempt === 1) {
                        // Retry with new token
                        config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
                        continue;
                    } else {
                        // Refresh failed, user needs to login
                        localStorage.removeItem('token');
                        this.showLogin();
                        throw new Error('Authentication expired');
                    }
                }
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return await response.json();
            } catch (error) {
                console.warn(`Request attempt ${attempt} failed:`, error.message);
                
                if (attempt === this.retryAttempts) {
                    throw error;
                }
                
                // Exponential backoff
                await new Promise(resolve => 
                    setTimeout(resolve, this.retryDelay * Math.pow(2, attempt - 1))
                );
            }
        }
    }

    // Get valid token with automatic refresh
    async getValidToken() {
        if (window.tokenManager) {
            return await window.tokenManager.getValidToken();
        }
        return localStorage.getItem('token');
    }

    // Refresh token if needed
    async refreshTokenIfNeeded() {
        if (window.tokenManager) {
            return await window.tokenManager.refreshToken();
        }
        return false;
    }

    // Check authentication status
    async checkAuthStatus() {
        const token = await this.getValidToken();
        if (!token) {
            this.showLogin();
            return;
        }

        try {
            const data = await this.makeRequest('/auth/verify');
            appState.setUser(data.user);
            this.showAuthenticatedUI();
            await this.loadDashboard();
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('token');
            this.showLogin();
        }
    }

    // Setup modern event listeners
    setupEventListeners() {
        // Modal management
        document.addEventListener('click', this.handleModalClick.bind(this));
        
        // Form submissions
        document.addEventListener('submit', this.handleFormSubmit.bind(this));
        
        // Navigation
        document.addEventListener('click', this.handleNavigationClick.bind(this));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
        
        // Window events
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    }

    // Setup online/offline status monitoring
    setupOnlineStatusListener() {
        window.addEventListener('online', () => {
            appState.setOnlineStatus(true);
            this.showNotification('Connection restored', 'success');
        });

        window.addEventListener('offline', () => {
            appState.setOnlineStatus(false);
            this.showNotification('Connection lost - working offline', 'warning');
        });
    }

    // Setup keyboard navigation for accessibility
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (event) => {
            // Escape key closes modals
            if (event.key === 'Escape') {
                this.closeAllModals();
            }
            
            // Tab navigation improvements
            if (event.key === 'Tab') {
                this.handleTabNavigation(event);
            }
        });
    }

    // Event handlers
    handleModalClick(event) {
        if (event.target.classList.contains('modal')) {
            this.closeModal(event.target.id);
        }
    }

    handleFormSubmit(event) {
        const form = event.target;
        if (form.dataset.async) {
            event.preventDefault();
            this.handleAsyncForm(form);
        }
    }

    handleNavigationClick(event) {
        const link = event.target.closest('[data-section]');
        if (link) {
            event.preventDefault();
            const section = link.dataset.section;
            this.showSection(section);
        }
    }

    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + K for search
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            this.focusSearch();
        }
    }

    handleBeforeUnload(event) {
        // Save any pending changes
        this.savePendingChanges();
    }

    // Modern UI methods
    showAuthenticatedUI() {
        const navbar = document.getElementById('mainNavbar');
        const loginSection = document.getElementById('loginSection');
        
        if (navbar && loginSection) {
            navbar.style.display = 'block';
            loginSection.classList.remove('active');
            this.showSection('dashboard');
        }
    }

    showLogin() {
        const navbar = document.getElementById('mainNavbar');
        const loginSection = document.getElementById('loginSection');
        
        if (navbar && loginSection) {
            navbar.style.display = 'none';
            loginSection.classList.add('active');
        }
    }

    // Modern notification system
    showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toastContainer') || this.createToastContainer();
        
        const notification = document.createElement('div');
        notification.className = `toast toast-${type}`;
        notification.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(notification);
        
        // Auto remove after duration
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, duration);
    }

    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // Error handling
    showError(message) {
        this.showNotification(message, 'error', 10000);
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }
}

// Modern app class available but not auto-initialized to avoid conflicts
// const app = new SimplifiAccessApp();

// Legacy compatibility - keep existing functions for now
let currentUser = null;
let currentPage = 1;
let currentFilters = {};
let currentSection = 'dashboard';

// Get valid token with automatic refresh
async function getValidToken() {
    if (window.tokenManager) {
        return await window.tokenManager.getValidToken();
    }
    return localStorage.getItem('token');
}

// Refresh token if needed
async function refreshTokenIfNeeded() {
    if (window.tokenManager) {
        return await window.tokenManager.refreshToken();
    }
    return false;
}

// Check if user is authenticated
async function checkAuthStatus() {
    const token = await getValidToken();
    if (token) {
        try {
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                currentUser = data.user;
                showAuthenticatedUI();
                loadDashboard();
                // Start polling-based real-time updates when a session already exists
                setTimeout(() => {
                    if (typeof initializeUserWebhook === 'function') {
                        console.log('🔄 Initializing user event poller after auth check...');
                        initializeUserWebhook();
                    }
                    // SSE path remains disabled; keep call for future compatibility
                    if (!isEventStreamConnected) {
                        console.log('🔄 Establishing SSE connection after auth check (disabled path)...');
                        connectEventStream();
                    }
                }, 1000);
            } else {
                localStorage.removeItem('token');
                showLogin();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('token');
            showLogin();
        }
    } else {
        showLogin();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.classList.remove('active');
        }
    });
    
    // Close mobile menu when clicking outside
    window.addEventListener('click', function(event) {
        const navMenu = document.getElementById('navMenu');
        const navToggle = document.querySelector('.nav-toggle');
        
        if (navMenu.classList.contains('active') && 
            !navMenu.contains(event.target) && 
            !navToggle.contains(event.target)) {
            closeMobileMenu();
        }
    });
    
    // Add debugging for login form
    const emailField = document.getElementById('email');
    const passwordField = document.getElementById('password');
    const loginForm = document.getElementById('loginForm');
    
    if (emailField) {
        console.log('Email field found:', emailField);
        
        // Add click event listener for debugging
        emailField.addEventListener('click', function() {
            console.log('Email field clicked!');
        });
        
        // Add focus event listener for debugging
        emailField.addEventListener('focus', function() {
            console.log('Email field focused!');
        });
        
        // Add input event listener for debugging
        emailField.addEventListener('input', function() {
            console.log('Email field input:', this.value);
        });
        
        // Ensure the field is properly accessible
        emailField.style.pointerEvents = 'auto';
        emailField.style.zIndex = '30';
        emailField.style.position = 'relative';
        
        // Test if field is focusable
        try {
            emailField.focus();
            console.log('Email field is focusable');
        } catch (e) {
            console.error('Email field is not focusable:', e.message);
        }
    } else {
        console.error('Email field not found!');
    }
    
    if (passwordField) {
        console.log('Password field found:', passwordField);
        passwordField.style.pointerEvents = 'auto';
        passwordField.style.zIndex = '30';
        passwordField.style.position = 'relative';
    } else {
        console.error('Password field not found!');
    }
    
    if (loginForm) {
        console.log('Login form found:', loginForm);
        
        // Ensure form submission works
        loginForm.addEventListener('submit', function(event) {
            console.log('Form submit event triggered');
        });
    } else {
        console.error('Login form not found!');
    }
}

// Settings Section Functions

// Load settings page
async function loadSettings() {
    if (!currentUser || !hasRole('admin')) {
        app.showNotification('Access denied. Admin privileges required.', 'error');
        return;
    }
    
    try {
        await Promise.all([
            loadSystemInfo(),
            loadVersionInfo(),
            loadWebhookStatus()
        ]);
        
        // Initialize backup functionality
        setupFileUpload();
        refreshBackupList();
    } catch (error) {
        console.error('Failed to load settings:', error);
        app.showNotification('Failed to load settings', 'error');
    }
}

// Load system information
async function loadSystemInfo() {
    try {
        const response = await fetch('/api/settings/system-info', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateSystemInfo(data);
        } else {
            console.error('Failed to load system info');
        }
    } catch (error) {
        console.error('System info error:', error);
    }
}

// Update system information display
function updateSystemInfo(info) {
    document.getElementById('serverUptime').textContent = formatUptime(info.uptime);
    document.getElementById('serverEnvironment').textContent = info.environment;
    document.getElementById('totalUsers').textContent = info.totalUsers;
    document.getElementById('totalDoors').textContent = info.totalDoors;
}

// Load version information
async function loadVersionInfo() {
    try {
        const response = await fetch('/api/settings/version-info', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateVersionInfo(data);
        } else {
            console.error('Failed to load version info');
        }
    } catch (error) {
        console.error('Version info error:', error);
    }
}

// Update version information display
function updateVersionInfo(info) {
    document.getElementById('commitSha').textContent = info.commitSha;
    document.getElementById('buildDate').textContent = formatDate(info.buildDate);
    document.getElementById('buildEnvironment').textContent = info.environment;
    document.getElementById('nodeVersion').textContent = info.nodeVersion;
}

// Format date in human readable format
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleString();
    } catch (error) {
        return dateString;
    }
}

// Copy commit SHA to clipboard
function copyCommitSha() {
    const commitSha = document.getElementById('commitSha').textContent;
    navigator.clipboard.writeText(commitSha).then(() => {
        app.showNotification('Commit SHA copied to clipboard!', 'success');
    }).catch(() => {
        app.showNotification('Failed to copy commit SHA', 'error');
    });
}

// Refresh version information
function refreshVersionInfo() {
    loadVersionInfo();
    app.showNotification('Version information refreshed', 'success');
}

// Webhook Management Functions
async function loadWebhookStatus() {
    try {
        console.log('Loading webhook status...');
        const response = await fetch('/api/webhooks', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        console.log('Webhook status response:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Webhook status data:', data);
            updateWebhookStatus(data);
        } else {
            console.error('Failed to load webhook status');
            document.getElementById('webhookStatusDisplay').innerHTML = '<span class="error">Failed to load webhook status</span>';
        }
    } catch (error) {
        console.error('Webhook status error:', error);
        document.getElementById('webhookStatusDisplay').innerHTML = '<span class="error">Error loading webhook status</span>';
    }
}

function updateWebhookStatus(data) {
    const statusDiv = document.getElementById('webhookStatusDisplay');
    const listDiv = document.getElementById('webhookListDisplay');
    
    if (data.webhooks && data.webhooks.length > 0) {
        const activeWebhooks = data.webhooks.filter(w => w.active);
        const inactiveWebhooks = data.webhooks.filter(w => !w.active);
        
        statusDiv.innerHTML = `
            <div class="status-summary">
                <span class="status-indicator active"></span>
                <strong>${activeWebhooks.length} active webhook(s)</strong>
                <span class="status-indicator inactive"></span>
                <span>${inactiveWebhooks.length} inactive</span>
            </div>
        `;
        
        listDiv.innerHTML = data.webhooks.map(webhook => `
            <div class="webhook-item">
                <div class="webhook-header">
                    <h4>${webhook.name}</h4>
                    <span class="status-indicator ${webhook.active ? 'active' : 'inactive'}"></span>
                </div>
                <div class="webhook-url">${webhook.url}</div>
                <div class="webhook-events">Events: ${webhook.events.join(', ')}</div>
                <div class="webhook-actions">
                    <button class="btn btn-sm" onclick="testWebhook('${webhook.id}')">
                        <i class="fas fa-play"></i> Test
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteWebhook('${webhook.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    } else {
        statusDiv.innerHTML = `
            <div class="status-summary">
                <span class="status-indicator inactive"></span>
                <strong>No webhooks configured</strong>
            </div>
        `;
        listDiv.innerHTML = '<div class="no-webhooks">No webhooks configured yet. Create one above to get started.</div>';
    }
}

async function createWebhook(event) {
    event.preventDefault();
    
    const name = document.getElementById('webhookName').value;
    const url = document.getElementById('webhookUrl').value;
    const events = Array.from(document.querySelectorAll('.event-checkboxes input[type="checkbox"]:checked')).map(cb => cb.value);
    
    console.log('Creating webhook with:', { name, url, events });
    
    if (events.length === 0) {
        app.showNotification('Please select at least one event.', 'error');
        return;
    }

    try {
        const requestBody = { name, url, events };
        console.log('Sending request body:', requestBody);
        
        const response = await fetch('/api/webhooks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        const result = await response.json();
        console.log('Response result:', result);
        
        if (result.success) {
            app.showNotification('Webhook created successfully!', 'success');
            document.getElementById('webhookForm').reset();
            loadWebhookStatus();
        } else {
            app.showNotification('Error: ' + (result.message || 'Failed to create webhook'), 'error');
        }
    } catch (error) {
        console.error('Create webhook error:', error);
        app.showNotification('Error: ' + error.message, 'error');
    }
}

async function testWebhook(webhookId) {
    try {
        const response = await fetch(`/api/webhooks/${webhookId}/test`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const result = await response.json();
        
        if (result.success) {
            app.showNotification('Test webhook sent successfully!', 'success');
        } else {
            app.showNotification('Test failed: ' + (result.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        app.showNotification('Error: ' + error.message, 'error');
    }
}

async function deleteWebhook(webhookId) {
    if (!confirm('Are you sure you want to delete this webhook?')) {
        return;
    }

    try {
        const response = await fetch(`/api/webhooks/${webhookId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const result = await response.json();
        
        if (result.success) {
            app.showNotification('Webhook deleted successfully!', 'success');
            loadWebhookStatus();
        } else {
            app.showNotification('Error: ' + (result.message || 'Failed to delete webhook'), 'error');
        }
    } catch (error) {
        app.showNotification('Error: ' + error.message, 'error');
    }
}

async function testAllWebhooks() {
    try {
        const response = await fetch('/api/webhook-test/trigger-test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                event: 'webhook.test',
                timestamp: new Date().toISOString(),
                data: {
                    message: 'Test webhook from admin panel',
                    testType: 'admin_panel_test',
                    timestamp: new Date().toISOString()
                }
            })
        });

        const result = await response.json();
        
        if (result.success) {
            app.showNotification('Test webhook sent to all configured webhooks!', 'success');
        } else {
            app.showNotification('Test failed: ' + (result.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        app.showNotification('Error: ' + error.message, 'error');
    }
}

function showSlackExample() {
    const example = `
Slack Setup:
1. Go to https://api.slack.com/apps
2. Create new app → "From scratch"
3. Go to "Incoming Webhooks" → Activate
4. Add webhook to workspace → Choose channel
5. Copy the webhook URL
6. Use it in the form above

Example webhook URL format:
https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK/URL
    `;
    alert(example);
}

function showEmailExample() {
    const example = `
Email Setup:
1. Go to https://zapier.com or https://ifttt.com
2. Create a new Zap/Applet
3. Choose "Webhooks" as trigger
4. Choose "Email" as action
5. Use the webhook URL from Zapier/IFTTT
6. Configure email settings
    `;
    alert(example);
}

function showMobileExample() {
    const example = `
Mobile Push Setup:
1. Set up Firebase Cloud Messaging (FCM)
2. Create webhook endpoint in your mobile app
3. Configure push notification service
4. Use your app's webhook URL
5. Test with door offline events
    `;
    alert(example);
}

// Format uptime in human readable format
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}
















// Authentication functions
async function handleLogin(event) {
    event.preventDefault();
    console.log('Login form submitted'); // Debug log
    
    // Debug: Check if form elements exist
    const emailField = document.getElementById('email');
    const passwordField = document.getElementById('password');
    console.log('Email field:', emailField);
    console.log('Password field:', passwordField);
    
    if (!emailField || !passwordField) {
        console.error('Form fields not found!');
        app.showNotification('Form error: Fields not found', 'error');
        return;
    }
    
    showLoading();
    
    const formData = new FormData(event.target);
    const loginData = {
        email: formData.get('email'),
        password: formData.get('password')
    };
    
    console.log('Login data:', loginData); // Debug log
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            showAuthenticatedUI();
            loadDashboard();
            // SSE connection disabled - using webhook-based system instead
            console.log('🔄 SSE disabled, using webhook-based real-time updates');
            
            // Initialize user webhook system for real-time updates
            setTimeout(() => {
                if (typeof initializeUserWebhook === 'function') {
                    console.log('🔄 Initializing user webhook system...');
                    initializeUserWebhook();
                }
            }, 1000);
            app.showNotification('Login successful!', 'success');
        } else {
            // Handle specific error codes
            if (data.code === 'WEB_ACCESS_DENIED') {
                app.showNotification('Access denied: ' + data.message, 'error');
            } else {
                app.showNotification(data.message || 'Login failed', 'error');
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        app.showNotification('Login failed. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

async function handleRegister(event) {
    event.preventDefault();
    showLoading();
    
    const formData = new FormData(event.target);
    const registerData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        password: formData.get('password')
    };
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registerData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            showAuthenticatedUI();
            loadDashboard();
            // Ensure SSE connection is established after registration
            setTimeout(() => {
                if (!isEventStreamConnected) {
                    console.log('🔄 Establishing SSE connection after registration...');
                    connectEventStream();
                }
            }, 1000);
            app.showNotification('Registration successful!', 'success');
        } else {
            app.showNotification(data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        app.showNotification('Registration failed. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    closeMobileMenu(); // Close mobile menu on logout
    
    // Stop token manager
    if (window.tokenManager) {
        window.tokenManager.stop();
    }
    
    // Cleanup user webhook system
    if (typeof cleanupUserWebhook === 'function') {
        cleanupUserWebhook();
    }
    
    showLogin();
    app.showNotification('Logged out successfully', 'info');
}

// UI Navigation functions
function showLogin() {
    hideAllSections();
    document.getElementById('loginSection').classList.add('active');
    document.getElementById('registerSection').classList.remove('active');
    document.getElementById('mainNavbar').style.display = 'none';
}

function showRegister() {
    hideAllSections();
    document.getElementById('registerSection').classList.add('active');
    document.getElementById('mainNavbar').style.display = 'none';
}

function showAuthenticatedUI() {
    hideAllSections();
    document.getElementById('dashboardSection').classList.add('active');
    document.getElementById('mainNavbar').style.display = 'block';
    updateProfileInfo();
}



function hideAllSections() {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));
}

function toggleNav() {
    const navMenu = document.getElementById('navMenu');
    const navToggle = document.querySelector('.nav-toggle');
    
    // Toggle display directly
    if (navMenu.style.display === 'none' || navMenu.style.display === '') {
        navMenu.style.display = 'flex';
        if (navToggle) {
            navToggle.setAttribute('aria-expanded', 'true');
        }
    } else {
        navMenu.style.display = 'none';
        if (navToggle) {
            navToggle.setAttribute('aria-expanded', 'false');
        }
    }
}

function closeMobileMenu() {
    const navMenu = document.getElementById('navMenu');
    const navToggle = document.querySelector('.nav-toggle');
    
    // Only hide on mobile
    if (window.innerWidth <= 768) {
        navMenu.style.display = 'none';
        if (navToggle) {
            navToggle.setAttribute('aria-expanded', 'false');
        }
    }
}

// Site Map functions

function showDashboardDoorsLoading() {
    const doorGrid = document.getElementById('doorGrid');
    if (doorGrid) {
        doorGrid.innerHTML = `
            <div class="door-card loading-card" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                </div>
                <h3 style="color: #00ff41; margin: 1rem 0 0.5rem 0;">Loading Doors...</h3>
                <p style="color: #adb5bd; margin: 0;">Please wait while we fetch your door data</p>
            </div>
        `;
    }
}

function hideDashboardDoorsLoading() {
    // Loading will be hidden when displayDoorStatus is called
}

async function loadDashboard() {
    if (!currentUser || !hasRole('admin')) {
        return;
    }
    
    try {
        // Show loading animation for doors
        showDashboardDoorsLoading();
        
        // Load recent events first
        await loadEvents();
        
        // Delay door loading to ensure everything is initialized
        console.log('About to start setTimeout for site plan loading... [NEW VERSION - TIMESTAMP: ' + Date.now() + ']');
        setTimeout(async () => {
            try {
                console.log('setTimeout callback started');
                await loadDashboardDoors();
                console.log('loadDashboardDoors completed');
                hideDashboardDoorsLoading();
                console.log('hideDashboardDoorsLoading completed');
                
                // Load doors and site plan background when site map is shown
                console.log('sitePlanManager exists:', !!sitePlanManager);
                if (sitePlanManager) {
                    console.log('Loading doors and site plan background for site map... [NEW VERSION - TIMESTAMP: ' + Date.now() + ']');
                    sitePlanManager.restoreBackgroundImage(); // Load background image
                    sitePlanManager.loadDoorPositions(); // Load doors with positions
                } else {
                    console.log('sitePlanManager not available - skipping site plan load');
                }
            } catch (error) {
                console.error('Failed to load site map doors:', error);
                hideDashboardDoorsLoading();
            }
        }, 500); // Longer delay to ensure initialization
        
        // Note: Door status updates are handled via Server-Sent Events (SSE)
        // No need for manual refresh intervals
    } catch (error) {
        console.error('Failed to load site map data:', error);
        hideDashboardDoorsLoading();
    }
}

async function loadDashboardDoors() {
    // Use the working loadDoors function but intercept the data
    if (!currentUser || !hasRole('admin')) {
        return;
    }
    
    try {
        // Store the original displayDoors function
        const originalDisplayDoors = window.displayDoors;
        
        // Create a promise to capture the doors data
        let capturedDoors = null;
        let capturePromise = new Promise((resolve) => {
            window.displayDoors = function(doors) {
                capturedDoors = doors;
                resolve(doors);
            };
        });
        
        // Call the working loadDoors function
        await loadDoors(1);
        
        // Wait for the data to be captured
        await capturePromise;
        
        // Restore the original function
        window.displayDoors = originalDisplayDoors;
        
        // Add test doors to demonstrate different states
        const testDoors = [
            {
                id: 'test-1',
                name: 'Test - Online Locked',
                location: 'Test Lab',
                controllerIp: '192.168.1.200',
                isOnline: true,
                lastSeen: new Date().toISOString(),
                hasLockSensor: true,
                hasDoorPositionSensor: true,
                isLocked: true,
                isOpen: false
            },
            {
                id: 'test-2',
                name: 'Test - Online Unlocked',
                location: 'Test Lab',
                controllerIp: '192.168.1.201',
                isOnline: true,
                lastSeen: new Date().toISOString(),
                hasLockSensor: true,
                hasDoorPositionSensor: true,
                isLocked: false,
                isOpen: false
            },
            {
                id: 'test-3',
                name: 'Test - Online Open',
                location: 'Test Lab',
                controllerIp: '192.168.1.202',
                isOnline: true,
                lastSeen: new Date().toISOString(),
                hasLockSensor: true,
                hasDoorPositionSensor: true,
                isLocked: false,
                isOpen: true
            },
            {
                id: 'test-4',
                name: 'Test - Offline',
                location: 'Test Lab',
                controllerIp: '192.168.1.203',
                isOnline: false,
                lastSeen: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
                hasLockSensor: false,
                hasDoorPositionSensor: false,
                isLocked: null,
                isOpen: null
            }
        ];
        
        // Combine real doors with test doors
        const allDoors = [...(capturedDoors || []), ...testDoors];
        
        // Display all doors
        displayDoorStatus(allDoors);
        
    } catch (error) {
        // If that fails, show empty state
        displayDoorStatus([]);
    }
}

async function loadDoorStatus() {
    try {
        console.log('Loading door status...');
        const params = new URLSearchParams({
            page: 1,
            limit: 100
        });
        
        const response = await forceRefresh(`/api/doors?${params}`);
        
        console.log('Door status response:', response.status, response.statusText);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Door status data:', data);
            console.log('Door status loaded:', data.doors ? data.doors.length : 'no doors property', 'doors');
            displayDoorStatus(data.doors || []);
        } else {
            console.error('Failed to load door status:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Error response:', errorText);
            displayDoorStatus([]);
        }
    } catch (error) {
        console.error('Load door status error:', error);
        displayDoorStatus([]);
    }
}

function displayDoorStatus(doors) {
    console.log('Displaying door status:', doors);
    const doorGrid = document.getElementById('doorGrid');
    
    if (!doorGrid) {
        console.log('doorGrid element not found - skipping door status display');
        return;
    }
    
    // TEST: Add a hardcoded door to see if display works
    if (!doors || doors.length === 0) {
        console.log('No doors to display, showing empty state');
        doorGrid.innerHTML = `
            <div class="door-card" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                <i class="fas fa-door-open" style="font-size: 2rem; color: #adb5bd; margin-bottom: 1rem;"></i>
                <h3 style="color: #6c757d; margin: 0 0 0.5rem 0;">No Doors Found</h3>
                <p style="color: #adb5bd; margin: 0;">No doors have been configured yet.</p>
                <p style="color: #ff6b6b; margin: 0.5rem 0 0 0; font-size: 0.8rem;">DEBUG: If you see 6 doors in Door Management, there's an API issue.</p>
            </div>
        `;
        return;
    }
    
    console.log('Rendering', doors.length, 'doors');
    
    // Enhanced door display with different states
    doorGrid.innerHTML = doors.map((door, index) => {
        // Determine door state classes
        let doorStateClass = 'offline';
        let statusText = 'Offline';
        let secondaryText = 'Disconnected';
        
        if (door.isOnline) {
            if (door.isOpen) {
                doorStateClass = 'open';
                statusText = 'Open';
                secondaryText = 'Unlocked';
            } else if (door.isLocked === true) {
                doorStateClass = 'locked-closed';
                statusText = 'Locked';
                secondaryText = 'Closed';
            } else if (door.isLocked === false) {
                doorStateClass = 'unlocked-closed';
                statusText = 'Unlocked';
                secondaryText = 'Closed';
            } else {
                doorStateClass = 'online';
                statusText = 'Online';
                secondaryText = 'Ready';
            }
        }
        
        return `
            <div class="door-card" style="animation-delay: ${index * 0.1}s;">
                <div class="door-header">
                    <h3 class="door-name">${door.name}</h3>
                    <div class="door-status-badge ${door.isOnline ? 'online' : 'offline'}">
                        <i class="fas fa-circle"></i>
                        ${door.isOnline ? 'Online' : 'Offline'}
                    </div>
                </div>
                <div class="door-location">${door.location}</div>
                
                <!-- Door Icon Only -->
                <div class="door-visualization">
                    <div class="door-frame">
                        <div class="door-panel ${doorStateClass}"></div>
                    </div>
                </div>
                
                <div class="door-ip">${door.controllerIp}</div>
                <div class="door-last-seen">
                    ${door.lastSeen ? `Last seen: ${formatDoorTime(door.lastSeen)}` : 'Never seen'}
                </div>
            </div>
        `;
    }).join('');
}

// Test function to debug door loading
async function testDoorLoading() {
    console.log('=== TESTING DOOR LOADING ===');
    
    try {
        // Test 1: Simple API call like dashboard was doing
        console.log('Test 1: Simple API call');
        const simpleResponse = await forceRefresh('/api/doors?limit=100');
        console.log('Simple response:', simpleResponse.status, simpleResponse.statusText);
        if (simpleResponse.ok) {
            const simpleData = await simpleResponse.json();
            console.log('Simple data:', simpleData);
        }
        
        // Test 2: Same API call as Door Management
        console.log('Test 2: Door Management style API call');
        const params = new URLSearchParams({
            page: 1,
            limit: 10
        });
        const mgmtResponse = await forceRefresh(`/api/doors?${params}`);
        console.log('Management response:', mgmtResponse.status, mgmtResponse.statusText);
        if (mgmtResponse.ok) {
            const mgmtData = await mgmtResponse.json();
            console.log('Management data:', mgmtData);
        }
        
        // Test 3: Dashboard style API call
        console.log('Test 3: Dashboard style API call');
        const dashboardParams = new URLSearchParams({
            page: 1,
            limit: 100
        });
        const dashboardResponse = await forceRefresh(`/api/doors?${dashboardParams}`);
        console.log('Dashboard response:', dashboardResponse.status, dashboardResponse.statusText);
        if (dashboardResponse.ok) {
            const dashboardData = await dashboardResponse.json();
            console.log('Dashboard data:', dashboardData);
        }
        
    } catch (error) {
        console.error('Test error:', error);
    }
    
    console.log('=== END TEST ===');
}


function formatDoorTime(timestamp) {
    // Handle timezone issue - database stores UTC time but we need local time
    let date;
    if (timestamp.includes(' ')) {
        // If it's in format "YYYY-MM-DD HH:mm:ss", treat as UTC and convert to local
        // Add 'Z' to indicate UTC, then JavaScript will convert to local timezone
        date = new Date(timestamp + 'Z');
    } else {
        date = new Date(timestamp);
    }
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) {
        return 'Just now';
    } else if (diffMins < 60) {
        return `${diffMins}m ago`;
    } else if (diffHours < 24) {
        return `${diffHours}h ago`;
    } else if (diffDays < 7) {
        return `${diffDays}d ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// Door Visualization Functions
function getDoorVisualClass(door) {
    if (!door.isOnline) return 'offline';
    if (door.isOpen) return 'open';
    if (door.isLocked === true) return 'locked-closed';
    if (door.isLocked === false) return 'unlocked-closed';
    return 'unknown';
}

function getDoorHandleClass(door) {
    if (!door.isOnline) return 'offline';
    if (door.isOpen) return 'open';
    if (door.isLocked === true) return 'locked';
    if (door.isLocked === false) return 'unlocked';
    return 'unknown';
}

function getDoorLockClass(door) {
    if (!door.isOnline) return 'offline';
    if (door.isOpen) return 'open';
    if (door.isLocked === true) return 'locked';
    if (door.isLocked === false) return 'unlocked';
    return 'unknown';
}

function getDoorStatusBadgeClass(door) {
    if (!door.isOnline) return 'offline';
    if (door.isOpen) return 'open';
    if (door.isLocked === false) return 'unlocked';
    if (door.isLocked === true) return 'locked';
    return 'unknown';
}

function getDoorStatusBadgeText(door) {
    if (!door.isOnline) return 'Offline';
    if (door.isOpen) return 'Open';
    if (door.isLocked === false) return 'Unlocked';
    if (door.isLocked === true) return 'Locked';
    return 'Unknown';
}

function getDoorStatusClass(door) {
    if (!door.isOnline) return 'offline';
    if (door.isOpen) return 'open';
    if (door.isLocked === false) return 'unlocked';
    if (door.isLocked === true) return 'locked';
    return 'unknown';
}

function getDoorStatusIcon(door) {
    if (!door.isOnline) return 'fa-wifi-slash';
    if (door.isOpen) return 'fa-door-open';
    if (door.isLocked === false) return 'fa-unlock';
    if (door.isLocked === true) return 'fa-lock';
    return 'fa-question-circle';
}

function getDoorPrimaryStatus(door) {
    if (!door.isOnline) return 'Offline';
    if (door.isOpen) return 'Open';
    if (door.isLocked === false) return 'Unlocked';
    if (door.isLocked === true) return 'Locked';
    return 'Unknown';
}

function getDoorSecondaryStatus(door) {
    if (!door.isOnline) return 'No connection';
    
    const states = [];
    if (door.isOpen) states.push('Open');
    if (door.isLocked === true) states.push('Locked');
    if (door.isLocked === false) states.push('Unlocked');
    if (door.isOpen === false) states.push('Closed');
    
    return states.length > 0 ? states.join(' • ') : 'Status unknown';
}

function displayStats(stats) {
    const statsGrid = document.getElementById('statsGrid');
    statsGrid.innerHTML = `
        <div class="stat-card users">
            <i class="fas fa-users"></i>
            <h3>${stats.totalUsers}</h3>
            <p>Total Users</p>
        </div>
        <div class="stat-card active">
            <i class="fas fa-user-check"></i>
            <h3>${stats.activeUsers}</h3>
            <p>Active Users</p>
        </div>
        <div class="stat-card admins">
            <i class="fas fa-user-shield"></i>
            <h3>${stats.adminUsers}</h3>
            <p>Administrators</p>
        </div>
        <div class="stat-card doors">
            <i class="fas fa-door-open"></i>
            <h3>${stats.totalDoors || 0}</h3>
            <p>Total Doors</p>
        </div>
        <div class="stat-card access-groups">
            <i class="fas fa-shield-alt"></i>
            <h3>${stats.totalAccessGroups || 0}</h3>
            <p>Access Groups</p>
        </div>
    `;
}

// User management functions
async function loadUsers(page = 1) {
    if (!currentUser || !hasRole('admin')) {
        return;
    }
    
    showLoading();
    currentPage = page;
    
    try {
        const params = new URLSearchParams({
            page: page,
            limit: 10,
            ...currentFilters
        });
        
        const response = await forceRefresh(`/api/users?${params}`);
        
        if (response.ok) {
            const data = await response.json();
            displayUsers(data.users);
            
            // Use proper pagination if available, otherwise simple pagination
            if (data.pagination) {
                displayPagination(data.pagination);
            } else {
                displaySimplePagination(data.totalCount);
            }
        } else {
            app.showNotification('Failed to load users', 'error');
        }
    } catch (error) {
        console.error('Failed to load users:', error);
        app.showNotification('Failed to load users', 'error');
    } finally {
        hideLoading();
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.firstName} ${user.lastName}</td>
            <td>${user.email}</td>
            <td><span class="role-badge ${user.role}">${user.role}</span></td>
            <td><span class="status-indicator active compact">Active</span></td>
            <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit" onclick="editUser(${user.id})" title="Edit User">
                        <i class="fas fa-edit"></i>
                        <span class="btn-text">Edit</span>
                    </button>
                    <button class="action-btn visitors" onclick="manageUserVisitors(${user.id})" title="Manage Visitors">
                        <i class="fas fa-id-badge"></i>
                        <span class="btn-text">Visitors</span>
                    </button>
                    <button class="action-btn access-groups" onclick="manageUserAccessGroups(${user.id})" title="Access Groups">
                        <i class="fas fa-shield-alt"></i>
                        <span class="btn-text">Access</span>
                    </button>
                    <button class="action-btn delete" onclick="deleteUser(${user.id})" ${user.id === currentUser.id ? 'disabled' : ''} title="Delete User">
                        <i class="fas fa-trash"></i>
                        <span class="btn-text">Delete</span>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function displayPagination(pagination) {
    const paginationDiv = document.getElementById('pagination');
    const { page, totalPages, hasNext, hasPrev } = pagination;
    
    let paginationHTML = `
        <button ${!hasPrev ? 'disabled' : ''} onclick="loadUsers(${page - 1})">
            <i class="fas fa-chevron-left"></i> Previous
        </button>
    `;
    
    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
        paginationHTML += `
            <button class="${i === page ? 'active' : ''}" onclick="loadUsers(${i})">${i}</button>
        `;
    }
    
    paginationHTML += `
        <button ${!hasNext ? 'disabled' : ''} onclick="loadUsers(${page + 1})">
            Next <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    paginationDiv.innerHTML = paginationHTML;
}

function displaySimplePagination(totalCount) {
    const paginationDiv = document.getElementById('pagination');
    paginationDiv.innerHTML = `<span>Showing ${totalCount} users</span>`;
}

function searchUsers() {
    const searchTerm = document.getElementById('searchInput').value;
    currentFilters.search = searchTerm || undefined;
    loadUsers(1);
}

function filterUsers() {
    const roleFilter = document.getElementById('roleFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    currentFilters.role = roleFilter || undefined;
    currentFilters.isActive = statusFilter || undefined;
    
    loadUsers(1);
}

// User CRUD functions
function showCreateUserModal() {
    document.getElementById('createUserModal').classList.add('active');
    document.getElementById('createUserForm').reset();
}

async function handleCreateUser(event) {
    event.preventDefault();
    showLoading();
    
    const formData = new FormData(event.target);
    const userData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: formData.get('role')
    };
    
    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('createUserModal');
            loadUsers(currentPage);
            app.showNotification('User created successfully!', 'success');
        } else {
            app.showNotification(data.message || 'Failed to create user', 'error');
        }
    } catch (error) {
        console.error('Create user error:', error);
        app.showNotification('Failed to create user', 'error');
    } finally {
        hideLoading();
    }
}

async function editUser(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const user = data.user;
            
            document.getElementById('editUserId').value = user.id;
            document.getElementById('editFirstName').value = user.firstName;
            document.getElementById('editLastName').value = user.lastName;
            document.getElementById('editEmail').value = user.email;
            document.getElementById('editRole').value = user.role;
            
            document.getElementById('editUserModal').classList.add('active');
        }
    } catch (error) {
        console.error('Failed to load user for editing:', error);
        app.showNotification('Failed to load user data', 'error');
    }
}

async function handleEditUser(event) {
    event.preventDefault();
    showLoading();
    
    const formData = new FormData(event.target);
    const userId = formData.get('id');
    const userData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        role: formData.get('role')
    };
    
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('editUserModal');
            loadUsers(currentPage);
            app.showNotification('User updated successfully!', 'success');
        } else {
            app.showNotification(data.message || 'Failed to update user', 'error');
        }
    } catch (error) {
        console.error('Update user error:', error);
        app.showNotification('Failed to update user', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            loadUsers(currentPage);
            app.showNotification('User deleted successfully!', 'success');
        } else {
            const data = await response.json();
            app.showNotification(data.message || 'Failed to delete user', 'error');
        }
    } catch (error) {
        console.error('Delete user error:', error);
        app.showNotification('Failed to delete user', 'error');
    } finally {
        hideLoading();
    }
}

// Visitor management
function manageUserVisitors(userId) {
    try {
        const userIdInput = document.getElementById('visitorsUserId');
        if (userIdInput) userIdInput.value = userId;
        const form = document.getElementById('addVisitorForm');
        if (form) form.reset();
        const modal = document.getElementById('userVisitorsModal');
        if (modal) modal.classList.add('active');
        loadUserVisitors(userId);
    } catch (e) {
        console.error('Failed to open visitors modal:', e);
    }
}

async function loadUserVisitors(userId) {
    showLoading();
    try {
        const response = await fetch(`/api/users/${userId}/visitors?includeExpired=true`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) {
            app.showNotification('Failed to load visitors', 'error');
            return;
        }
        const data = await response.json();
        const visitors = data.visitors || [];
        renderUserVisitors(visitors);
    } catch (error) {
        console.error('Load visitors error:', error);
        app.showNotification('Failed to load visitors', 'error');
    } finally {
        hideLoading();
    }
}

function renderUserVisitors(visitors) {
    const container = document.getElementById('userVisitorsList');
    if (!container) return;
    if (!visitors.length) {
        container.innerHTML = '<div class="info">No visitors registered yet.</div>';
        return;
    }
    const now = new Date();
    const html = visitors.map(v => {
        const validToDate = v.validTo ? new Date(v.validTo) : null;
        const isExpired = validToDate ? validToDate < now : false;
        return `
            <div class="visitor-item ${isExpired ? 'expired' : 'active'}">
                <div class="visitor-main">
                    <div class="visitor-name">${escapeHtml(v.visitorName || '')}</div>
                    <div class="visitor-contact">${escapeHtml(v.email || '')}${v.phone ? ' • ' + escapeHtml(v.phone) : ''}</div>
                </div>
                <div class="visitor-validity">${formatDate(v.validFrom)} → ${formatDate(v.validTo)} ${isExpired ? '<span class="role-badge">Expired</span>' : ''}</div>
                <div class="visitor-actions">
                    <button class="action-btn delete" title="Delete Visitor" onclick="deleteVisitor(${v.id}, ${v.userId})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');
    container.innerHTML = html;
}

function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}

function formatDate(val) {
    if (!val) return '';
    try {
        return new Date(val).toLocaleString();
    } catch (e) {
        return val;
    }
}

async function handleAddVisitor(event) {
    event.preventDefault();
    const userIdEl = document.getElementById('visitorsUserId');
    const userId = userIdEl ? parseInt(userIdEl.value) : null;
    if (!userId) {
        app.showNotification('Missing user id', 'error');
        return;
    }
    const form = event.target;
    const visitorName = form.visitorName.value.trim();
    const email = form.email.value.trim();
    const phone = form.phone.value.trim();
    const validToRaw = form.validTo.value;
    if (!visitorName || !validToRaw) {
        app.showNotification('Name and Valid Until are required', 'error');
        return;
    }
    let validTo;
    try {
        validTo = new Date(validToRaw).toISOString();
    } catch (e) {
        app.showNotification('Invalid date/time', 'error');
        return;
    }
    showLoading();
    try {
        const response = await fetch(`/api/visitors/user/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ visitorName, email: email || undefined, phone: phone || undefined, validTo })
        });
        const data = await response.json();
        if (response.ok) {
            form.reset();
            await loadUserVisitors(userId);
            app.showNotification('Visitor added', 'success');
        } else {
            app.showNotification(data.message || 'Failed to add visitor', 'error');
        }
    } catch (error) {
        console.error('Add visitor error:', error);
        app.showNotification('Failed to add visitor', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteVisitor(visitorId, userId) {
    if (!confirm('Are you sure you want to delete this visitor?')) return;
    showLoading();
    try {
        const response = await fetch(`/api/visitors/${visitorId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (response.ok) {
            await loadUserVisitors(userId);
            app.showNotification('Visitor deleted', 'success');
        } else {
            const data = await response.json();
            app.showNotification(data.message || 'Failed to delete visitor', 'error');
        }
    } catch (error) {
        console.error('Delete visitor error:', error);
        app.showNotification('Failed to delete visitor', 'error');
    } finally {
        hideLoading();
    }
}

// Profile functions
function updateProfileInfo() {
    if (currentUser) {
        document.getElementById('profileName').textContent = `${currentUser.firstName} ${currentUser.lastName}`;
        document.getElementById('profileEmail').textContent = currentUser.email;
        document.getElementById('profileRole').textContent = currentUser.role;
        document.getElementById('profileRole').className = `role-badge ${currentUser.role}`;
    }
}

function showChangePasswordModal() {
    document.getElementById('changePasswordModal').classList.add('active');
    document.getElementById('changePasswordForm').reset();
}

async function handleChangePassword(event) {
    event.preventDefault();
    showLoading();
    
    const formData = new FormData(event.target);
    const passwordData = {
        currentPassword: formData.get('currentPassword'),
        newPassword: formData.get('newPassword')
    };
    
    try {
        const response = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(passwordData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('changePasswordModal');
            app.showNotification('Password changed successfully! Please login with your new password.', 'success');
            // Log out user after password change
            setTimeout(() => {
                logout();
            }, 2000);
        } else {
            // Handle validation errors with more specific messages
            if (data.error === 'Validation Error' && data.errors) {
                let errorMessage = 'Password validation failed:\n';
                if (data.errors.newPassword) {
                    errorMessage += `• ${data.errors.newPassword}\n`;
                }
                if (data.errors.currentPassword) {
                    errorMessage += `• ${data.errors.currentPassword}\n`;
                }
                app.showNotification(errorMessage.trim(), 'error');
            } else {
                app.showNotification(data.message || 'Failed to change password', 'error');
            }
        }
    } catch (error) {
        console.error('Change password error:', error);
        app.showNotification('Failed to change password', 'error');
    } finally {
        hideLoading();
    }
}

// Utility functions
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    
    // Reset form if it's the door controller config modal
    if (modalId === 'doorControllerConfigModal') {
        const form = document.getElementById('doorControllerConfigForm');
        if (form) {
            form.reset();
        }
    }
}

// Backup and Restore Functions
let selectedBackupFile = null;

// Create a new backup
async function createBackup() {
    try {
        showLoading();
        const response = await fetch('/api/backup/backup/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({})
        });
        
        const data = await response.json();
        
        if (data.success) {
            app.showNotification('Backup created successfully!', 'success');
            refreshBackupList();
        } else {
            app.showNotification(data.message || 'Failed to create backup', 'error');
        }
    } catch (error) {
        console.error('Error creating backup:', error);
        app.showNotification('Failed to create backup', 'error');
    } finally {
        hideLoading();
    }
}

// Refresh the backup list
async function refreshBackupList() {
    try {
        const response = await fetch('/api/backup/backups', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayBackupList(data.backups);
            updateBackupStatus(data.backups);
        } else {
            app.showNotification('Failed to load backup list', 'error');
        }
    } catch (error) {
        console.error('Error loading backups:', error);
        app.showNotification('Failed to load backup list', 'error');
    }
}

// Display the backup list
function displayBackupList(backups) {
    const tbody = document.getElementById('backupTableBody');
    
    if (backups.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No backups available</td></tr>';
        return;
    }
    
    tbody.innerHTML = backups.map(backup => {
        const createdDate = new Date(backup.created).toLocaleString();
        const fileSize = formatFileSize(backup.size);
        const totalRecords = backup.metadata ? 
            backup.metadata.tables.reduce((sum, table) => sum + table.recordCount, 0) : 0;
        
        return `
            <tr>
                <td>${backup.fileName}</td>
                <td>${createdDate}</td>
                <td>${fileSize}</td>
                <td>${totalRecords.toLocaleString()}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="downloadBackup('${backup.fileName}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="restoreBackup('${backup.fileName}')">
                        <i class="fas fa-upload"></i> Restore
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteBackup('${backup.fileName}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Update backup status
function updateBackupStatus(backups) {
    document.getElementById('totalBackups').textContent = backups.length;
    
    if (backups.length > 0) {
        const latest = backups[0];
        const createdDate = new Date(latest.created).toLocaleString();
        document.getElementById('latestBackup').textContent = createdDate;
    } else {
        document.getElementById('latestBackup').textContent = 'None';
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Download a backup
async function downloadBackup(fileName) {
    try {
        showLoading();
        
        const response = await fetch(`/api/backup/backup/download/${fileName}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to download backup');
        }
        
        // Get the blob data
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        hideLoading();
        app.showNotification('Backup downloaded successfully', 'success');
        
    } catch (error) {
        hideLoading();
        console.error('Download error:', error);
        app.showNotification(`Download failed: ${error.message}`, 'error');
    }
}

// Restore a backup
async function restoreBackup(fileName) {
    if (!confirm('Are you sure you want to restore this backup? This will replace all current data.')) {
        return;
    }
    
    try {
        showLoading();
        const response = await fetch('/api/backup/import', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                filePath: `./backups/${fileName}`,
                clearExisting: true,
                createBackup: true
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            app.showNotification('Database restored successfully!', 'success');
            refreshBackupList();
            // Refresh all data
            if (typeof loadUsers === 'function') loadUsers();
            if (typeof loadDoors === 'function') loadDoors();
            if (typeof loadAccessGroups === 'function') loadAccessGroups();
            if (typeof loadEvents === 'function') loadEvents();
        } else {
            app.showNotification(data.message || 'Failed to restore backup', 'error');
        }
    } catch (error) {
        console.error('Error restoring backup:', error);
        app.showNotification('Failed to restore backup', 'error');
    } finally {
        hideLoading();
    }
}

// Delete a backup
async function deleteBackup(fileName) {
    if (!confirm(`Are you sure you want to delete backup "${fileName}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/backup/backup/${fileName}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            app.showNotification('Backup deleted successfully!', 'success');
            refreshBackupList();
        } else {
            app.showNotification(data.message || 'Failed to delete backup', 'error');
        }
    } catch (error) {
        console.error('Error deleting backup:', error);
        app.showNotification('Failed to delete backup', 'error');
    }
}

// Setup file upload for import
function setupFileUpload() {
    const fileInput = document.getElementById('backupFileInput');
    const uploadArea = document.getElementById('fileUploadArea');
    const importBtn = document.getElementById('importBtn');
    
    // Click to select file
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Handle file selection
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedBackupFile = file;
            uploadArea.innerHTML = `
                <i class="fas fa-check-circle" style="color: #22c55e;"></i>
                <p>Selected: ${file.name}</p>
                <p style="font-size: 0.8rem; color: #6b7280;">Size: ${formatFileSize(file.size)}</p>
            `;
            importBtn.disabled = false;
        }
    });
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#3b82f6';
        uploadArea.style.backgroundColor = '#eff6ff';
    });
    
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#d1d5db';
        uploadArea.style.backgroundColor = '#f9fafb';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#d1d5db';
        uploadArea.style.backgroundColor = '#f9fafb';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type === 'application/json' || file.name.endsWith('.json')) {
                fileInput.files = files;
                fileInput.dispatchEvent(new Event('change'));
            } else {
                app.showNotification('Please select a JSON backup file', 'error');
            }
        }
    });
}

// Import database from uploaded file
async function importDatabase() {
    console.log('Import function called');
    console.log('Selected file:', selectedBackupFile);
    
    if (!selectedBackupFile) {
        app.showNotification('Please select a backup file first', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to import this database? This will replace all current data.')) {
        return;
    }
    
    try {
        showLoading();
        console.log('Starting import process...');
        
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('backupFile', selectedBackupFile);
        
        // Get import options
        const clearExisting = document.getElementById('clearExisting').checked;
        const skipUsers = document.getElementById('skipUsers').checked;
        const skipEvents = document.getElementById('skipEvents').checked;
        const skipAccessLog = document.getElementById('skipAccessLog').checked;
        
        formData.append('importOptions', JSON.stringify({
            clearExisting,
            skipUsers,
            skipEvents,
            skipAccessLog
        }));
        
        console.log('Sending request to server...');
        const response = await fetch('/api/backup/import/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.success) {
            app.showNotification('Database imported successfully!', 'success');
            clearImportFile();
            refreshBackupList();
            // Refresh all data
            if (typeof loadUsers === 'function') loadUsers();
            if (typeof loadDoors === 'function') loadDoors();
            if (typeof loadAccessGroups === 'function') loadAccessGroups();
            if (typeof loadEvents === 'function') loadEvents();
        } else {
            app.showNotification(data.message || 'Failed to import database', 'error');
        }
    } catch (error) {
        console.error('Error importing database:', error);
        app.showNotification('Failed to import database', 'error');
    } finally {
        hideLoading();
    }
}

// Clear selected import file
function clearImportFile() {
    selectedBackupFile = null;
    document.getElementById('backupFileInput').value = '';
    document.getElementById('fileUploadArea').innerHTML = `
        <i class="fas fa-cloud-upload-alt"></i>
        <p>Drop backup file here or click to select</p>
    `;
    document.getElementById('importBtn').disabled = true;
}

function showLoading() {
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

// Legacy showToast function - now uses the modern notification system
function showToast(message, type = 'info') {
    // Use the modern notification system instead
    if (window.app && window.app.showNotification) {
        window.app.showNotification(message, type);
    } else {
        // Fallback for when app is not initialized
        console.log(`Toast: ${type.toUpperCase()} - ${message}`);
    }
}

// Helper function to check if user has role
function hasRole(role) {
    return currentUser && currentUser.role === role;
}

// Door management functions
async function loadDoors(page = 1) {
    if (!currentUser || !hasRole('admin')) {
        return;
    }
    
    showLoading();
    currentPage = page;
    
    try {
        const params = new URLSearchParams({
            page: page,
            limit: 10,
            ...currentFilters
        });
        
        const response = await forceRefresh(`/api/doors?${params}`);
        
        if (response.ok) {
            const data = await response.json();
            
            // Load tags for each door
            const doorsWithTags = await Promise.all(data.doors.map(async (door) => {
                try {
                    const tagsResponse = await forceRefresh(`/api/door-tags/door/${door.id}`);
                    
                    if (tagsResponse.ok) {
                        const tagsData = await tagsResponse.json();
                        door.tags = tagsData.doorTags || [];
                        console.log(`Loaded ${door.tags.length} tags for door ${door.id}`);
                    } else {
                        console.error(`Failed to load tags for door ${door.id}:`, tagsResponse.status, tagsResponse.statusText);
                        const errorText = await tagsResponse.text();
                        console.error('Error response:', errorText);
                        door.tags = [];
                        // Don't show error for empty tags - this is normal
                    }
                } catch (error) {
                    console.error(`Error loading tags for door ${door.id}:`, error);
                    door.tags = [];
                }
                
                return door;
            }));
            
            displayDoors(doorsWithTags);
            displayDoorsPagination(data.pagination);
        } else {
            app.showNotification('Failed to load doors', 'error');
        }
    } catch (error) {
        console.error('Failed to load doors:', error);
        app.showNotification('Failed to load doors', 'error');
    } finally {
        hideLoading();
    }
}

function displayDoors(doors) {
    const tbody = document.getElementById('doorsTableBody');
    tbody.innerHTML = doors.map(door => `
        <tr>
            <td>${door.name}</td>
            <td>${door.location}</td>
            <td>${door.controllerIp}</td>
            <td>
                <span class="status-indicator ${door.isOnline ? 'online' : 'offline'} compact">
                    ${door.isOnline ? 'Online' : 'Offline'}
                </span>
            </td>
            <td class="door-tag-cell">
                ${formatDoorTags(door.tags || [])}
            </td>
            <td>${door.lastSeen ? formatDoorTime(door.lastSeen) : 'Never'}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit" onclick="editDoor(${door.id})" title="Edit Door">
                        <i class="fas fa-edit"></i>
                        <span class="btn-text">Edit</span>
                    </button>
                    <button class="action-btn tags" onclick="manageDoorTags(${door.id})" title="Manage Tags">
                        <i class="fas fa-tags"></i>
                        <span class="btn-text">Tags</span>
                    </button>
                    <button class="action-btn delete" onclick="deleteDoor(${door.id})" title="Delete Door">
                        <i class="fas fa-trash"></i>
                        <span class="btn-text">Delete</span>
                    </button>
                    ${door.isOnline ? `
                        <button class="action-btn control" onclick="controlDoor(${door.id}, 'open')" title="Open Door">
                            <i class="fas fa-door-open"></i>
                            <span class="btn-text">Open</span>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
    
    // Update last refresh time
}

function displayDoorsPagination(pagination) {
    const paginationDiv = document.getElementById('doorsPagination');
    const { page, totalPages, hasNext, hasPrev } = pagination;
    
    let paginationHTML = `
        <button ${!hasPrev ? 'disabled' : ''} onclick="loadDoors(${page - 1})">
            <i class="fas fa-chevron-left"></i> Previous
        </button>
    `;
    
    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
        paginationHTML += `
            <button class="${i === page ? 'active' : ''}" onclick="loadDoors(${i})">${i}</button>
        `;
    }
    
    paginationHTML += `
        <button ${!hasNext ? 'disabled' : ''} onclick="loadDoors(${page + 1})">
            Next <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    paginationDiv.innerHTML = paginationHTML;
}

function searchDoors() {
    const searchTerm = document.getElementById('doorSearchInput').value;
    currentFilters.search = searchTerm;
    loadDoors(1);
}

function filterDoors() {
    const statusFilter = document.getElementById('doorStatusFilter').value;
    currentFilters.isActive = statusFilter;
    loadDoors(1);
}

async function controlDoor(doorId, action) {
    try {
        console.log(`Attempting to control door ${doorId} with action: ${action}`);
        
        const response = await fetch(`/api/doors/${doorId}/control`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ action })
        });
        
        console.log(`Control response status: ${response.status}`);
        const data = await response.json();
        console.log('Control response data:', data);
        
        if (response.ok) {
            app.showNotification(data.message, 'success');
            
            // Immediately update site map door status for visual feedback
            if (sitePlanManager) {
                console.log(`🚪 Immediately updating site map for door ${doorId} - ${action}`);
                
                // Find the door in site map
                const siteMapDoor = sitePlanManager.doors.find(d => d.id === doorId);
                if (siteMapDoor) {
                    const oldStatus = siteMapDoor.status;
                    
                    if (action === 'open') {
                        siteMapDoor.status = 'open';
                        siteMapDoor.isOpen = true;
                        
                        // Add visual highlight
                        sitePlanManager.highlightDoorStatusChange(siteMapDoor, oldStatus, 'open');
                        
                        // Redraw immediately
                        sitePlanManager.drawSitePlan();
                        
                        // Reset to closed after 5 seconds (same as access granted)
                        setTimeout(() => {
                            if (siteMapDoor.status === 'open') {
                                siteMapDoor.status = 'closed';
                                siteMapDoor.isOpen = false;
                                sitePlanManager.drawSitePlan();
                                console.log(`🚪 Site map door ${siteMapDoor.name} reset to CLOSED after manual open`);
                            }
                        }, 5000);
                    } else if (action === 'close' || action === 'lock') {
                        siteMapDoor.status = 'closed';
                        siteMapDoor.isOpen = false;
                        siteMapDoor.isLocked = true;
                        
                        // Add visual highlight
                        sitePlanManager.highlightDoorStatusChange(siteMapDoor, oldStatus, 'closed');
                        
                        // Redraw immediately
                        sitePlanManager.drawSitePlan();
                        console.log(`🚪 Site map door ${siteMapDoor.name} set to CLOSED after manual ${action}`);
                    } else if (action === 'unlock') {
                        siteMapDoor.status = 'closed';
                        siteMapDoor.isOpen = false;
                        siteMapDoor.isLocked = false;
                        
                        // Add visual highlight
                        sitePlanManager.highlightDoorStatusChange(siteMapDoor, oldStatus, 'closed');
                        
                        // Redraw immediately
                        sitePlanManager.drawSitePlan();
                        console.log(`🚪 Site map door ${siteMapDoor.name} set to UNLOCKED after manual ${action}`);
                    }
                }
            }
        } else {
            app.showNotification(data.message || 'Failed to control door', 'error');
        }
    } catch (error) {
        console.error('Door control error:', error);
        app.showNotification('Failed to control door', 'error');
    }
}

function showCreateDoorModal() {
    document.getElementById('createDoorModal').classList.add('active');
}

async function handleCreateDoor(event) {
    event.preventDefault();
    showLoading();
    
    const formData = new FormData(event.target);
    const doorData = {
        name: formData.get('name'),
        location: formData.get('location'),
        controllerIp: formData.get('controllerIp'),
        controllerMac: formData.get('controllerMac'),
        hasLockSensor: formData.get('hasLockSensor') === 'true',
        hasDoorPositionSensor: formData.get('hasDoorPositionSensor') === 'true'
    };
    
    // Clear previous validation errors
    clearDoorValidationErrors();
    
    try {
        const response = await fetch('/api/doors', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(doorData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('createDoorModal');
            event.target.reset();
            refreshDoorRelatedUI();
        } else {
            // Debug: Log the response to see what we're getting
            console.log('Door creation failed. Response:', data);
            
            // Handle validation errors
            if (data.errors) {
                console.log('Validation errors found:', data.errors);
                displayDoorValidationErrors(data.errors);
                // Show a general error toast for validation failures
                const errorMessages = Object.values(data.errors);
                if (errorMessages.some(msg => msg.includes('already in use'))) {
                    app.showNotification('Please fix the duplicate address errors below', 'error');
                } else {
                    app.showNotification('Please fix the validation errors below', 'error');
                }
            } else {
                console.log('No validation errors, showing generic message');
                app.showNotification(data.message || 'Failed to create door', 'error');
            }
        }
    } catch (error) {
        console.error('Create door error:', error);
        app.showNotification('Failed to create door', 'error');
    } finally {
        hideLoading();
    }
}

async function editDoor(doorId) {
    try {
        const response = await fetch(`/api/doors/${doorId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const door = data.door;
            
            document.getElementById('editDoorId').value = door.id;
            document.getElementById('editDoorName').value = door.name;
            document.getElementById('editDoorLocation').value = door.location;
            document.getElementById('editDoorControllerIp').value = door.controllerIp;
            document.getElementById('editDoorControllerMac').value = door.controllerMac || '';
            document.getElementById('editDoorHasLockSensor').value = door.hasLockSensor.toString();
            document.getElementById('editDoorHasDoorPositionSensor').value = door.hasDoorPositionSensor.toString();
            
            document.getElementById('editDoorModal').classList.add('active');
        } else {
            app.showNotification('Failed to load door details', 'error');
        }
    } catch (error) {
        console.error('Edit door error:', error);
        app.showNotification('Failed to load door details', 'error');
    }
}

async function handleEditDoor(event) {
    event.preventDefault();
    showLoading();
    
    const formData = new FormData(event.target);
    const doorId = formData.get('id');
    const doorData = {
        name: formData.get('name'),
        location: formData.get('location'),
        controllerIp: formData.get('controllerIp'),
        controllerMac: formData.get('controllerMac'),
        hasLockSensor: formData.get('hasLockSensor') === 'true',
        hasDoorPositionSensor: formData.get('hasDoorPositionSensor') === 'true'
    };
    
    // Clear previous validation errors
    clearDoorValidationErrors();
    
    try {
        const response = await fetch(`/api/doors/${doorId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(doorData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            app.showNotification('Door updated successfully!', 'success');
            closeModal('editDoorModal');
            refreshDoorRelatedUI();
        } else {
            // Handle validation errors
            if (data.errors) {
                displayDoorValidationErrors(data.errors);
                // Show a general error toast for validation failures
                const errorMessages = Object.values(data.errors);
                if (errorMessages.some(msg => msg.includes('already in use'))) {
                    app.showNotification('Please fix the duplicate address errors below', 'error');
                } else {
                    app.showNotification('Please fix the validation errors below', 'error');
                }
            } else {
                app.showNotification(data.message || 'Failed to update door', 'error');
            }
        }
    } catch (error) {
        console.error('Update door error:', error);
        app.showNotification('Failed to update door', 'error');
    } finally {
        hideLoading();
    }
}

// Door validation error handling
function clearDoorValidationErrors() {
    // Clear any existing error messages
    const errorElements = document.querySelectorAll('.door-error-message');
    errorElements.forEach(el => el.remove());
    
    // Remove error styling
    const errorInputs = document.querySelectorAll('.door-form input.error, .door-form select.error');
    errorInputs.forEach(input => input.classList.remove('error'));
}

function displayDoorValidationErrors(errors) {
    clearDoorValidationErrors();
    
    // Display validation errors
    Object.keys(errors).forEach(field => {
        const input = document.querySelector(`[name="${field}"]`);
        if (input) {
            input.classList.add('error');
            
            // Create error message element
            const errorDiv = document.createElement('div');
            errorDiv.className = 'door-error-message';
            
            // Format the error message with better styling
            const errorText = errors[field];
            if (errorText.includes('already in use')) {
                // Style duplicate errors differently
                errorDiv.innerHTML = `
                    <i class="fas fa-exclamation-triangle" style="margin-right: 4px;"></i>
                    <strong>Duplicate ${field === 'controllerIp' ? 'IP' : 'MAC'} Address:</strong> ${errorText}
                `;
                errorDiv.style.background = '#fdf2f2';
                errorDiv.style.border = '1px solid #fecaca';
                errorDiv.style.borderRadius = '4px';
                errorDiv.style.padding = '8px';
            } else {
                errorDiv.textContent = errorText;
            }
            
            errorDiv.style.color = '#e74c3c';
            errorDiv.style.fontSize = '12px';
            errorDiv.style.marginTop = '4px';
            errorDiv.style.display = 'block';
            
            // Insert after the input
            input.parentNode.insertBefore(errorDiv, input.nextSibling);
        }
    });
}

// Function to refresh all door-related UI elements
function refreshDoorRelatedUI() {
    // Refresh the main doors list
    loadDoors();
    
    // Refresh access group modal if it's open
    if (currentAccessGroupId && document.getElementById('accessGroupDetailsModal').classList.contains('active')) {
        manageAccessGroupDetails(currentAccessGroupId);
    }
    
    // Refresh user access groups modal if it's open
    if (currentUserId && document.getElementById('userAccessGroupsModal').classList.contains('active')) {
        manageUserAccessGroups(currentUserId);
    }
}

async function deleteDoor(doorId) {
    if (!confirm('Are you sure you want to delete this door?')) {
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`/api/doors/${doorId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            app.showNotification('Door deleted successfully!', 'success');
            refreshDoorRelatedUI();
        } else {
            const data = await response.json();
            app.showNotification(data.message || 'Failed to delete door', 'error');
        }
    } catch (error) {
        console.error('Delete door error:', error);
        app.showNotification('Failed to delete door', 'error');
    } finally {
        hideLoading();
    }
}

// Access Group management functions
async function loadAccessGroups(page = 1) {
    console.log('loadAccessGroups called with page:', page);
    console.log('currentUser:', currentUser);
    console.log('hasRole admin:', hasRole('admin'));
    
    if (!currentUser || !hasRole('admin')) {
        console.log('Access denied - not admin or no current user');
        return;
    }
    
    showLoading();
    currentPage = page;
    
    try {
        const params = new URLSearchParams({
            page: page,
            limit: 10,
            ...currentFilters
        });
        
        const response = await forceRefresh(`/api/access-groups?${params}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Access groups API response:', data);
            displayAccessGroups(data.accessGroups);
            displayAccessGroupsPagination(data.pagination);
        } else {
            console.error('Access groups API failed:', response.status, response.statusText);
            app.showNotification('Failed to load access groups', 'error');
        }
    } catch (error) {
        console.error('Failed to load access groups:', error);
        app.showNotification('Failed to load access groups', 'error');
    } finally {
        hideLoading();
    }
}

async function displayAccessGroups(accessGroups) {
    console.log('Displaying access groups:', accessGroups);
    const tbody = document.getElementById('accessGroupsTableBody');
    
    // Load door information for each access group
    const accessGroupsWithDoors = await Promise.all(
        accessGroups.map(async (group) => {
            try {
                const response = await forceRefresh(`/api/access-groups/${group.id}`);
                
                if (response.ok) {
                    const data = await response.json();
                    return {
                        ...group,
                        doors: data.doors || []
                    };
                } else {
                    return {
                        ...group,
                        doors: []
                    };
                }
            } catch (error) {
                console.error(`Error loading doors for access group ${group.id}:`, error);
                return {
                    ...group,
                    doors: []
                };
            }
        })
    );
    
    tbody.innerHTML = accessGroupsWithDoors.map(group => `
        <tr>
            <td>${group.name}</td>
            <td>${group.description || 'No description'}</td>
            <td>${formatDoorsColumn(group.doors)}</td>
            <td>${new Date(group.createdAt).toLocaleDateString()}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit" onclick="editAccessGroup(${group.id})" title="Edit Group">
                        <i class="fas fa-edit"></i>
                        <span class="btn-text">Edit</span>
                    </button>
                    <button class="action-btn details" onclick="manageAccessGroupDetails(${group.id})" title="Manage Doors">
                        <i class="fas fa-door-open"></i>
                        <span class="btn-text">Doors</span>
                    </button>
                    <button class="action-btn delete" onclick="deleteAccessGroup(${group.id})" title="Delete Group">
                        <i class="fas fa-trash"></i>
                        <span class="btn-text">Delete</span>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function formatDoorsColumn(doors) {
    if (!doors || doors.length === 0) {
        return '<span class="no-doors">No doors assigned</span>';
    }
    
    if (doors.length <= 3) {
        // Show all door names
        return doors.map(door => `
            <span class="door-tag">${door.name}</span>
        `).join('');
    } else {
        // Show first 2 doors + count
        const visibleDoors = doors.slice(0, 2);
        const remainingCount = doors.length - 2;
        
        return `
            ${visibleDoors.map(door => `<span class="door-tag">${door.name}</span>`).join('')}
            <span class="door-count">+${remainingCount} more</span>
        `;
    }
}

function formatDoorTags(tags) {
    if (!tags || tags.length === 0) {
        return '<span class="no-tags">No tags</span>';
    }
    
    if (tags.length <= 2) {
        // Show all tags
        return tags.map(tag => `
            <span class="door-tag-badge ${tag.tagType}">${tag.tagId}</span>
        `).join('');
    } else {
        // Show first tag + count
        const firstTag = tags[0];
        const remainingCount = tags.length - 1;
        
        return `
            <span class="door-tag-badge ${firstTag.tagType}">${firstTag.tagId}</span>
            <span class="door-count">+${remainingCount} more</span>
        `;
    }
}

function displayAccessGroupsPagination(pagination) {
    const paginationDiv = document.getElementById('accessGroupsPagination');
    const { page, totalPages, hasNext, hasPrev } = pagination;
    
    let paginationHTML = `
        <button ${!hasPrev ? 'disabled' : ''} onclick="loadAccessGroups(${page - 1})">
            <i class="fas fa-chevron-left"></i> Previous
        </button>
    `;
    
    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
        paginationHTML += `
            <button class="${i === page ? 'active' : ''}" onclick="loadAccessGroups(${i})">${i}</button>
        `;
    }
    
    paginationHTML += `
        <button ${!hasNext ? 'disabled' : ''} onclick="loadAccessGroups(${page + 1})">
            Next <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    paginationDiv.innerHTML = paginationHTML;
}

function searchAccessGroups() {
    const searchTerm = document.getElementById('accessGroupSearchInput').value;
    currentFilters.search = searchTerm;
    loadAccessGroups(1);
}


function showCreateAccessGroupModal() {
    document.getElementById('createAccessGroupModal').classList.add('active');
}

async function handleCreateAccessGroup(event) {
    event.preventDefault();
    showLoading();
    
    const formData = new FormData(event.target);
    const accessGroupData = {
        name: formData.get('name'),
        description: formData.get('description')
    };
    
    try {
        const response = await fetch('/api/access-groups', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(accessGroupData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            app.showNotification('Access group created successfully!', 'success');
            closeModal('createAccessGroupModal');
            event.target.reset();
            loadAccessGroups();
        } else {
            app.showNotification(data.message || 'Failed to create access group', 'error');
        }
    } catch (error) {
        console.error('Create access group error:', error);
        app.showNotification('Failed to create access group', 'error');
    } finally {
        hideLoading();
    }
}

async function editAccessGroup(accessGroupId) {
    try {
        const response = await fetch(`/api/access-groups/${accessGroupId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const accessGroup = data.accessGroup;
            
            document.getElementById('editAccessGroupId').value = accessGroup.id;
            document.getElementById('editAccessGroupName').value = accessGroup.name;
            document.getElementById('editAccessGroupDescription').value = accessGroup.description || '';
            
            document.getElementById('editAccessGroupModal').classList.add('active');
        } else {
            app.showNotification('Failed to load access group details', 'error');
        }
    } catch (error) {
        console.error('Edit access group error:', error);
        app.showNotification('Failed to load access group details', 'error');
    }
}

async function handleEditAccessGroup(event) {
    event.preventDefault();
    showLoading();
    
    const formData = new FormData(event.target);
    const accessGroupId = formData.get('id');
    const accessGroupData = {
        name: formData.get('name'),
        description: formData.get('description')
    };
    
    try {
        const response = await fetch(`/api/access-groups/${accessGroupId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(accessGroupData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            app.showNotification('Access group updated successfully!', 'success');
            closeModal('editAccessGroupModal');
            loadAccessGroups();
        } else {
            app.showNotification(data.message || 'Failed to update access group', 'error');
        }
    } catch (error) {
        console.error('Update access group error:', error);
        app.showNotification('Failed to update access group', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteAccessGroup(accessGroupId) {
    if (!confirm('Are you sure you want to delete this access group?')) {
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`/api/access-groups/${accessGroupId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            app.showNotification('Access group deleted successfully!', 'success');
            loadAccessGroups();
        } else {
            const data = await response.json();
            app.showNotification(data.message || 'Failed to delete access group', 'error');
        }
    } catch (error) {
        console.error('Delete access group error:', error);
        app.showNotification('Failed to delete access group', 'error');
    } finally {
        hideLoading();
    }
}

// User-Access Group Management Functions
let currentUserId = null;

async function manageUserAccessGroups(userId) {
    currentUserId = userId;
    
    try {
        // Load all access groups
        const accessGroupsResponse = await forceRefresh('/api/access-groups?limit=100');
        
        if (accessGroupsResponse.ok) {
            const accessGroupsData = await accessGroupsResponse.json();
            const allAccessGroups = accessGroupsData.accessGroups;
            
            // Get user's current access groups
            const userAccessGroupsResponse = await forceRefresh(`/api/users/${userId}/access-groups`);
            
            let currentAccessGroups = [];
            if (userAccessGroupsResponse.ok) {
                const userAccessGroupsData = await userAccessGroupsResponse.json();
                currentAccessGroups = userAccessGroupsData.accessGroups;
            }
            
            
            // Display access groups as checkboxes with current selection
            displayUserAccessGroups(allAccessGroups, currentAccessGroups);
            
            document.getElementById('userAccessGroupsModal').classList.add('active');
        }
    } catch (error) {
        console.error('Error loading user access groups:', error);
        app.showNotification('Failed to load user access groups', 'error');
    }
}

function displayUserAccessGroups(allAccessGroups, currentAccessGroups) {
    const container = document.getElementById('userAccessGroupsCheckboxList');
    const currentGroupIds = currentAccessGroups.map(group => group.id);
    
    container.innerHTML = allAccessGroups.map(group => {
        const isCurrentlyAssigned = currentGroupIds.includes(group.id);
        
        return `
            <div class="door-checkbox-item">
                <label>
                    <input type="checkbox" 
                           value="${group.id}" 
                           ${isCurrentlyAssigned ? 'checked' : ''}>
                    <div class="door-info">
                        <div class="door-name">${group.name}</div>
                        <div class="door-details">${group.description || 'No description'}</div>
                    </div>
                    <div class="door-status ${isCurrentlyAssigned ? 'currently-assigned' : 'available'}">
                        ${isCurrentlyAssigned ? 'Currently Assigned' : 'Available'}
                    </div>
                </label>
            </div>
        `;
    }).join('');
}


async function updateUserAccessGroups() {
    const checkboxes = document.querySelectorAll('#userAccessGroupsCheckboxList input[type="checkbox"]:checked');
    const accessGroupIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    
    showLoading();
    
    try {
        const response = await fetch(`/api/users/${currentUserId}/access-groups`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ accessGroupIds })
        });
        
        if (response.ok) {
            app.showNotification('User access groups updated successfully!', 'success');
            manageUserAccessGroups(currentUserId); // Reload the modal
        } else {
            const data = await response.json();
            app.showNotification(data.message || 'Failed to update user access groups', 'error');
        }
    } catch (error) {
        console.error('Error updating user access groups:', error);
        app.showNotification('Failed to update user access groups', 'error');
    } finally {
        hideLoading();
    }
}

function selectAllUserAccessGroups() {
    const checkboxes = document.querySelectorAll('#userAccessGroupsCheckboxList input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
}

function deselectAllUserAccessGroups() {
    const checkboxes = document.querySelectorAll('#userAccessGroupsCheckboxList input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
}

// Door Tag Management Functions
async function manageDoorTags(doorId) {
    try {
        console.log('Opening tag management for door:', doorId);
        
        // Get door information
        const doorResponse = await forceRefresh(`/api/doors/${doorId}`);
        
        if (!doorResponse.ok) {
            console.error('Failed to load door information:', doorResponse.status, doorResponse.statusText);
            app.showNotification('Failed to load door information', 'error');
            return;
        }
        
        const doorData = await doorResponse.json();
        const door = doorData.door;
        console.log('Door loaded:', door);
        
        // Get door tags
        console.log('Loading tags for door:', doorId);
        const token = localStorage.getItem('token');
        console.log('Using token:', token ? 'Token exists' : 'No token found');
        
        const tagsResponse = await forceRefresh(`/api/door-tags/door/${doorId}`);
        
        let tags = [];
        if (tagsResponse.ok) {
            const tagsData = await tagsResponse.json();
            tags = tagsData.doorTags || [];
            console.log('Tags loaded:', tags);
        } else {
            console.error('Failed to load tags:', tagsResponse.status, tagsResponse.statusText);
            const errorText = await tagsResponse.text();
            console.error('Error response:', errorText);
            // Don't show error toast for empty tags - just continue with empty array
            if (tagsResponse.status !== 404) {
                app.showNotification('Failed to load door tags', 'error');
                return;
            }
        }
        
        // Populate modal
        document.getElementById('doorTagDoorName').textContent = door.name;
        document.getElementById('doorTagDoorLocation').textContent = door.location;
        document.getElementById('addTagDoorId').value = doorId;
        
        // Clear form
        document.getElementById('addTagId').value = '';
        document.getElementById('addTagType').value = '';
        document.getElementById('addTagData').value = '';
        
        // Display tags
        displayDoorTags(tags);
        
        // Show modal
        console.log('Showing door tag modal');
        document.getElementById('doorTagModal').classList.add('active');
        
    } catch (error) {
        console.error('Error managing door tags:', error);
        app.showNotification('Failed to load door tag information', 'error');
    }
}

function displayDoorTags(tags) {
    const tagsList = document.getElementById('doorTagsList');
    
    if (!tags || tags.length === 0) {
        tagsList.innerHTML = '<div class="no-tags">No tags associated with this door</div>';
        return;
    }
    
    tagsList.innerHTML = tags.map(tag => `
        <div class="tag-item">
            <div class="tag-info">
                <div class="tag-id">${tag.tagId}</div>
                <div class="tag-type ${tag.tagType}">${tag.tagType.toUpperCase()}</div>
            </div>
            <div class="tag-actions">
                <button class="tag-remove-btn" onclick="removeDoorTag(${tag.id})">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        </div>
    `).join('');
}

async function handleAddTag(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const tagData = {
        tagId: formData.get('tagId'),
        tagType: formData.get('tagType'),
        tagData: formData.get('tagData') || null
    };
    
    const doorId = formData.get('doorId');
    
    try {
        const response = await fetch(`/api/door-tags`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                doorId: parseInt(doorId),
                tagId: tagData.tagId,
                tagType: tagData.tagType,
                tagData: tagData.tagData
            })
        });
        
        if (response.ok) {
            app.showNotification('Tag associated successfully!', 'success');
            
            try {
                // Reload tags
                const tagsResponse = await fetch(`/api/door-tags/door/${doorId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (tagsResponse.ok) {
                    const tagsData = await tagsResponse.json();
                    displayDoorTags(tagsData.doorTags);
                }
                
                // Clear form
                event.target.reset();
                document.getElementById('addTagDoorId').value = doorId;
                
                // Reload doors list to update tag display
                if (typeof loadDoors === 'function') {
                    loadDoors(currentDoorPage || 1);
                }
            } catch (reloadError) {
                console.error('Error reloading tags after creation:', reloadError);
                // Don't show error toast for reload issues, just log it
            }
        } else {
            const errorData = await response.json();
            app.showNotification(errorData.message || 'Failed to associate tag', 'error');
        }
    } catch (error) {
        console.error('Error adding tag:', error);
        app.showNotification('Failed to associate tag', 'error');
    }
}

async function removeDoorTag(tagId) {
    if (!confirm('Are you sure you want to remove this tag association?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/door-tags/${tagId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            app.showNotification('Tag association removed successfully!', 'success');
            
            // Get the door ID from the current modal
            const doorId = document.getElementById('addTagDoorId').value;
            
            // Reload tags
            const tagsResponse = await fetch(`/api/door-tags/door/${doorId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (tagsResponse.ok) {
                const tagsData = await tagsResponse.json();
                displayDoorTags(tagsData.doorTags);
            }
            
            // Reload doors list to update tag display
            if (typeof loadDoors === 'function') {
                loadDoors(currentDoorPage || 1);
            }
        } else {
            const errorData = await response.json();
            app.showNotification(errorData.message || 'Failed to remove tag association', 'error');
        }
    } catch (error) {
        console.error('Error removing tag:', error);
        app.showNotification('Failed to remove tag association', 'error');
    }
}




// Access Group-User Management Functions
let currentAccessGroupId = null;

async function manageAccessGroupDetails(accessGroupId) {
    currentAccessGroupId = accessGroupId;
    
    try {
        // Load access group details
        const accessGroupResponse = await forceRefresh(`/api/access-groups/${accessGroupId}`);
        
        if (accessGroupResponse.ok) {
            const accessGroupData = await accessGroupResponse.json();
            const accessGroup = accessGroupData.accessGroup;
            const currentDoors = accessGroupData.doors;
            
            // Load all doors for the checkboxes
            const doorsResponse = await forceRefresh('/api/doors?limit=100');
            
            if (doorsResponse.ok) {
                const doorsData = await doorsResponse.json();
                const allDoors = doorsData.doors;
                
                // Display doors as checkboxes with current selection
                displayAccessGroupDoors(allDoors, currentDoors);
                
                document.getElementById('accessGroupDetailsModal').classList.add('active');
            } else {
                console.error('Failed to load doors:', doorsResponse.status, doorsResponse.statusText);
                app.showNotification('Failed to load doors for selection', 'error');
            }
        } else {
            console.error('Failed to load access group:', accessGroupResponse.status, accessGroupResponse.statusText);
            app.showNotification('Failed to load access group details', 'error');
        }
    } catch (error) {
        console.error('Error loading access group details:', error);
        app.showNotification('Failed to load access group details', 'error');
    }
}

function displayAccessGroupDoors(allDoors, currentDoors) {
    const container = document.getElementById('availableDoorsList');
    const currentDoorIds = currentDoors.map(door => door.id);
    
    container.innerHTML = allDoors.map(door => {
        const isCurrentlyAssigned = currentDoorIds.includes(door.id);
        
        return `
            <div class="door-checkbox-item">
                <label>
                    <input type="checkbox" 
                           value="${door.id}" 
                           ${isCurrentlyAssigned ? 'checked' : ''}>
                    <div class="door-info">
                        <div class="door-name">${door.name}</div>
                        <div class="door-details">
                            <i class="fas fa-map-marker-alt"></i>
                            ${door.location} 
                            <i class="fas fa-wifi"></i>
                            ${door.controllerIp}
                        </div>
                    </div>
                    <div class="door-status ${isCurrentlyAssigned ? 'currently-assigned' : 'available'}">
                        ${isCurrentlyAssigned ? 'Currently Assigned' : 'Available'}
                    </div>
                </label>
            </div>
        `;
    }).join('');
}



async function updateAccessGroupDoors() {
    const allCheckboxes = document.querySelectorAll('#availableDoorsList input[type="checkbox"]');
    const checkedDoorIds = Array.from(allCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => parseInt(cb.value));
    
    // Get current doors to determine what needs to be added/removed
    const accessGroupResponse = await forceRefresh(`/api/access-groups/${currentAccessGroupId}`);
    
    if (!accessGroupResponse.ok) {
        app.showNotification('Failed to load current access group details', 'error');
        return;
    }
    
    const accessGroupData = await accessGroupResponse.json();
    const currentDoors = accessGroupData.doors;
    const currentDoorIds = currentDoors.map(door => door.id);
    
    // Find doors to add and remove
    const doorsToAdd = checkedDoorIds.filter(id => !currentDoorIds.includes(id));
    const doorsToRemove = currentDoorIds.filter(id => !checkedDoorIds.includes(id));
    
    if (doorsToAdd.length === 0 && doorsToRemove.length === 0) {
        app.showNotification('No changes to save', 'info');
        return;
    }
    
    showLoading();
    
    try {
        const promises = [];
        
        // Add new doors
        for (const doorId of doorsToAdd) {
            promises.push(
                fetch(`/api/access-groups/${currentAccessGroupId}/doors`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ doorId })
                })
            );
        }
        
        // Remove doors
        for (const doorId of doorsToRemove) {
            promises.push(
                fetch(`/api/access-groups/${currentAccessGroupId}/doors/${doorId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                })
            );
        }
        
        const responses = await Promise.all(promises);
        const failedResponses = responses.filter(response => !response.ok);
        
        if (failedResponses.length === 0) {
            // Success handled by webhook events - no duplicate toast needed
            manageAccessGroupDetails(currentAccessGroupId); // Reload the modal
        } else {
            app.showNotification(`Some operations failed. ${failedResponses.length} out of ${promises.length} operations failed.`, 'warning');
            manageAccessGroupDetails(currentAccessGroupId); // Reload the modal
        }
    } catch (error) {
        console.error('Error updating access group doors:', error);
        app.showNotification('Failed to update access group doors', 'error');
    } finally {
        hideLoading();
    }
}

function selectAllAvailableDoors() {
    const checkboxes = document.querySelectorAll('#availableDoorsList input[type="checkbox"]:not(:disabled)');
    checkboxes.forEach(cb => cb.checked = true);
}

function deselectAllAvailableDoors() {
    const checkboxes = document.querySelectorAll('#availableDoorsList input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
}




// NFC Card Management Functions
let nfcCards = [];

async function loadNFCCards() {
    if (!currentUser || !hasRole('admin')) {
        return;
    }
    
    try {
        showLoading();
        const response = await fetch('/api/doors', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            nfcCards = data.doors || [];
            displayNFCCards();
        } else {
            app.showNotification('Failed to load doors for NFC cards', 'error');
        }
    } catch (error) {
        console.error('Error loading NFC cards:', error);
        app.showNotification('Failed to load NFC cards', 'error');
    } finally {
        hideLoading();
    }
}

function displayNFCCards() {
    const grid = document.getElementById('nfcCardsGrid');
    if (!grid) return;
    
    if (nfcCards.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-credit-card" style="font-size: 3rem; color: #adb5bd; margin-bottom: 1rem;"></i>
                <h3>No Doors Available</h3>
                <p>Create some doors first to generate NFC cards.</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = nfcCards.map(door => `
        <div class="nfc-card" data-door-id="${door.id}">
            <div class="nfc-card-header">
                <div class="nfc-card-icon">
                    <i class="fas fa-credit-card"></i>
                </div>
                <div class="nfc-card-status ${door.isOnline ? 'online' : 'offline'}">
                    <i class="fas fa-circle"></i>
                    ${door.isOnline ? 'Online' : 'Offline'}
                </div>
            </div>
            <div class="nfc-card-body">
                <h3>${door.name}</h3>
                <p>${door.location}</p>
                <div class="nfc-card-url">
                    <label>NFC Card URL:</label>
                    <div class="url-display">
                        <input type="text" value="${window.location.origin}/door-access?door_id=${door.id}" readonly>
                        <button onclick="copyNFCCardUrl(${door.id})" class="btn btn-sm btn-secondary">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="nfc-card-actions">
                <button class="btn btn-primary" onclick="testNFCCard(${door.id})">
                    <i class="fas fa-external-link-alt"></i> Test Card
                </button>
                <button class="btn btn-secondary" onclick="downloadNFCCard(${door.id})">
                    <i class="fas fa-download"></i> Download QR
                </button>
            </div>
        </div>
    `).join('');
}

function showCreateNFCCardModal() {
    loadDoorsForNFCCard();
    document.getElementById('createNFCCardModal').classList.add('active');
    
    // Add event listeners for URL updates
    document.getElementById('nfcCardDoor').addEventListener('change', updateNFCCardUrl);
    document.getElementById('nfcCardType').addEventListener('change', updateNFCCardUrl);
}

async function loadDoorsForNFCCard() {
    try {
        const response = await fetch('/api/doors', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const doorSelect = document.getElementById('nfcCardDoor');
            doorSelect.innerHTML = '<option value="">Select a door...</option>';
            
            data.doors.forEach(door => {
                const option = document.createElement('option');
                option.value = door.id;
                option.textContent = `${door.name} - ${door.location}`;
                doorSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading doors for NFC card:', error);
    }
}

function handleCreateNFCCard(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const doorId = formData.get('doorId');
    const accessType = formData.get('accessType');
    
    if (!doorId) {
        app.showNotification('Please select a door', 'error');
        return;
    }
    
    // Generate the NFC card URL based on access type
    let nfcCardUrl;
    if (accessType === 'truly-silent') {
        // This would be a custom URL scheme for your mobile app
        // Replace 'yourapp' with your actual app's URL scheme
        nfcCardUrl = `yourapp://silent-access?door_id=${doorId}`;
    } else if (accessType === 'mobile-app') {
        nfcCardUrl = `${window.location.origin}/mobile-silent-access?door_id=${doorId}`;
    } else if (accessType === 'silent') {
        nfcCardUrl = `${window.location.origin}/silent-api-call?door_id=${doorId}`;
    } else {
        nfcCardUrl = `${window.location.origin}/door-access?door_id=${doorId}`;
    }
    
    document.getElementById('nfcCardUrl').value = nfcCardUrl;
    
    app.showNotification('NFC Card URL generated! Copy the URL to write to your NFC card.', 'success');
}

// Update NFC card URL when door or access type changes
function updateNFCCardUrl() {
    const doorId = document.getElementById('nfcCardDoor').value;
    const accessType = document.getElementById('nfcCardType').value;
    
    if (doorId) {
        let url;
        if (accessType === 'truly-silent') {
            url = `yourapp://silent-access?door_id=${doorId}`;
        } else if (accessType === 'mobile-app') {
            url = `${window.location.origin}/mobile-silent-access?door_id=${doorId}`;
        } else if (accessType === 'silent') {
            url = `${window.location.origin}/silent-api-call?door_id=${doorId}`;
        } else {
            url = `${window.location.origin}/door-access?door_id=${doorId}`;
        }
        document.getElementById('nfcCardUrl').value = url;
    } else {
        document.getElementById('nfcCardUrl').value = '';
    }
}

function copyNFCCardUrl() {
    const url = document.getElementById('nfcCardUrl').value;
    if (!url) {
        app.showNotification('Please generate a URL first', 'error');
        return;
    }
    
    navigator.clipboard.writeText(url).then(() => {
        app.showNotification('NFC Card URL copied to clipboard!', 'success');
    }).catch(() => {
        app.showNotification('Failed to copy URL', 'error');
    });
}

function testNFCCard(doorId) {
    const url = `${window.location.origin}/silent-api-call?door_id=${doorId}`;
    window.open(url, '_blank');
}

function downloadNFCCard(doorId) {
    const url = `${window.location.origin}/silent-api-call?door_id=${doorId}`;
    
    // Create a QR code for the NFC card
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
    
    // Create a temporary link to download the QR code
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `nfc-card-door-${doorId}.png`;
    link.click();
    
    app.showNotification('QR Code downloaded!', 'success');
}

// Generate a QR code from the currently generated NFC URL in the modal
function downloadQRFromGeneratedUrl() {
    const input = document.getElementById('nfcCardUrl');
    if (!input || !input.value) {
        app.showNotification('Please generate the NFC URL first', 'error');
        return;
    }
    const url = input.value;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = 'nfc-tag-qr.png';
    link.click();
    app.showNotification('QR Code downloaded!', 'success');
}

// Update the showSection function to handle new sections
function showSection(sectionName) {
    hideAllSections();
    document.getElementById(sectionName + 'Section').classList.add('active');
    currentSection = sectionName; // Track current section for auto-refresh
    
    // Close mobile menu after navigation
    closeMobileMenu();
    
    if (sectionName === 'dashboard') {
        loadDashboard();
        // SSE disabled - using webhook-based system instead
        console.log('🔄 SSE disabled for dashboard, using webhook-based updates');
        // Start aggressive polling for site map
        startSiteMapPolling();
    } else {
        // Stop site map polling when leaving dashboard
        stopSiteMapPolling();
        // SSE disabled - using webhook-based system instead
        console.log('🔄 SSE disabled for section, using webhook-based updates');
        if (sectionName === 'users') {
            loadUsers();
        } else if (sectionName === 'doors') {
            loadDoors();
        } else if (sectionName === 'events') {
            loadEvents();
        } else if (sectionName === 'accessGroups') {
            loadAccessGroups();
        } else if (sectionName === 'doorControllerDiscovery') {
            loadDoorControllerDiscovery();
        } else if (sectionName === 'profile') {
            updateProfileInfo();
        } else if (sectionName === 'settings') {
            loadSettings();
        } else if (sectionName === 'nfcCards') {
            loadNFCCards();
        }
        
        // Ensure keep-alive is running when user is active
        if (!keepAliveInterval) {
            startKeepAlive();
        }
    }
}

// Door Controller Discovery Functions
let discoveredControllers = [];
let scanInProgress = false;

async function loadDoorControllerDiscovery() {
    if (!currentUser || !hasRole('admin')) {
        return;
    }
    
    // Reset the discovery state
    discoveredControllers = [];
    scanInProgress = false;
    
    // Show initial scan status
    updateScanStatus('ready');
    displayDiscoveredControllers();
}

function updateScanStatus(status) {
    const scanStatusDiv = document.getElementById('scanStatus');
    
    switch (status) {
        case 'ready':
            scanStatusDiv.innerHTML = `
                <div class="scan-info">
                    <i class="fas fa-info-circle"></i>
                    <span>Click "Scan for Controllers" to discover devices on your network</span>
                </div>
            `;
            break;
        case 'scanning':
            scanStatusDiv.innerHTML = `
                <div class="scan-progress">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Scanning network for Door Controller devices...</span>
                </div>
            `;
            break;
        case 'complete':
            scanStatusDiv.innerHTML = `
                <div class="scan-info">
                    <i class="fas fa-check-circle"></i>
                    <span>Scan complete. Found ${discoveredControllers.length} Door Controller device(s)</span>
                </div>
            `;
            break;
        case 'error':
            scanStatusDiv.innerHTML = `
                <div class="scan-info" style="background: #f8d7da; color: #721c24;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Scan failed. Please try again.</span>
                </div>
            `;
            break;
    }
}

async function startDoorControllerScan() {
    if (scanInProgress) {
        return;
    }
    
    scanInProgress = true;
    discoveredControllers = [];
    updateScanStatus('scanning');
    displayDiscoveredControllers();
    
    try {
        // Call the backend API to discover Door Controller devices
        const response = await fetch('/api/doors/discover', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            discoveredControllers = data.devices;
            updateScanStatus('complete');
            displayDiscoveredControllers();
            
            // Show "Add All" button if devices were found
            if (discoveredControllers.length > 0) {
                document.getElementById('addAllBtn').style.display = 'block';
            }
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to discover Door Controller devices');
        }
        
    } catch (error) {
        console.error('Door Controller scan failed:', error);
        updateScanStatus('error');
        app.showNotification('Failed to scan for Door Controller devices: ' + error.message, 'error');
    } finally {
        scanInProgress = false;
    }
}


function displayDiscoveredControllers() {
    const container = document.getElementById('discoveredControllers');
    
    if (discoveredControllers.length === 0) {
        container.innerHTML = `
            <div class="no-devices">
                <i class="fas fa-wifi"></i>
                <p>No Door Controller devices discovered yet. Click "Scan for Controllers" to start discovery.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = discoveredControllers.map(controller => `
        <div class="controller-card ${controller.status}">
            <div class="controller-header">
                <div class="controller-title">${controller.name}</div>
                <div class="controller-status ${controller.status}">${controller.status}</div>
            </div>
            <div class="controller-details">
                <div class="controller-detail">
                    <span class="controller-detail-label">MAC Address:</span>
                    <span class="controller-detail-value">${controller.mac}</span>
                </div>
                <div class="controller-detail">
                    <span class="controller-detail-label">IP Address:</span>
                    <span class="controller-detail-value">${controller.ip}</span>
                </div>
                <div class="controller-detail">
                    <span class="controller-detail-label">Signal Strength:</span>
                    <span class="controller-detail-value">${controller.signal ? `${controller.signal} dBm` : 'N/A'}</span>
                </div>
                <div class="controller-detail">
                    <span class="controller-detail-label">Last Seen:</span>
                    <span class="controller-detail-value">${new Date(controller.lastSeen).toLocaleString()}</span>
                </div>
            </div>
            <div class="controller-actions">
                <button class="btn btn-primary" onclick="configureController('${controller.mac}', '${controller.ip}')" ${controller.status === 'offline' ? 'disabled' : ''}>
                    <i class="fas fa-cog"></i> Configure
                </button>
                <button class="btn btn-secondary" onclick="testControllerConnection('${controller.mac}', '${controller.ip}')" ${controller.status === 'offline' ? 'disabled' : ''}>
                    <i class="fas fa-plug"></i> Test
                </button>
            </div>
        </div>
    `).join('');
}

async function configureController(mac, ip) {
    // Load access groups for the dropdown
    try {
        const response = await forceRefresh('/api/access-groups?limit=100');
        
        if (response.ok) {
            const data = await response.json();
            const accessGroups = data.accessGroups;
            
            const dropdown = document.getElementById('doorControllerConfigAccessGroup');
            dropdown.innerHTML = '<option value="">Select an access group...</option>';
            
            accessGroups.forEach(group => {
                dropdown.innerHTML += `<option value="${group.id}">${group.name}</option>`;
            });
            
            // Populate the form
            document.getElementById('doorControllerConfigMac').value = mac;
            document.getElementById('doorControllerConfigIp').value = ip;
            document.getElementById('doorControllerConfigName').value = `Door ${mac.split(':').pop()}`;
            document.getElementById('doorControllerConfigLocation').value = 'Building A, Floor 1';
            
            // Show the modal
            document.getElementById('doorControllerConfigModal').classList.add('active');
        }
    } catch (error) {
        console.error('Failed to load access groups:', error);
        app.showNotification('Failed to load access groups', 'error');
    }
}

async function handleDoorControllerConfig(event) {
    event.preventDefault();
    showLoading();
    
    const formData = new FormData(event.target);
    const doorData = {
        name: formData.get('name'),
        location: formData.get('location'),
        controllerIp: formData.get('ip'),
        controllerMac: formData.get('mac'),
        accessGroupId: formData.get('accessGroupId') || null
    };
    
    try {
        const response = await fetch('/api/doors', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(doorData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('doorControllerConfigModal');
            
            // Remove the configured controller from the discovered list
            discoveredControllers = discoveredControllers.filter(controller => controller.mac !== doorData.controllerMac);
            displayDiscoveredControllers();
            
            // Update the scan status
            if (discoveredControllers.length === 0) {
                updateScanStatus('complete');
                document.getElementById('addAllBtn').style.display = 'none';
            }
            
            // Refresh the doors page if it's currently active
            if (document.getElementById('doorsSection').classList.contains('active')) {
                loadDoors();
            }
        } else {
            app.showNotification(data.message || 'Failed to configure Door Controller as door', 'error');
        }
    } catch (error) {
        console.error('Configure Door Controller error:', error);
        app.showNotification('Failed to configure Door Controller as door', 'error');
    } finally {
        hideLoading();
    }
}

async function testControllerConnection(mac, ip) {
    showLoading();
    
    try {
        // Test connection to Door Controller
        const response = await fetch(`http://${ip}/status`, {
            method: 'GET',
            timeout: 5000
        });
        
        if (response.ok) {
            app.showNotification('Door Controller connection test successful!', 'success');
        } else {
            app.showNotification('Door Controller connection test failed', 'error');
        }
    } catch (error) {
        console.error('Door Controller connection test failed:', error);
        app.showNotification('Door Controller connection test failed - device may be offline', 'error');
    } finally {
        hideLoading();
    }
}

async function addAllDiscoveredControllers() {
    if (discoveredControllers.length === 0) {
        app.showNotification('No Door Controller devices to add', 'info');
        return;
    }
    
    if (!confirm(`Add all ${discoveredControllers.length} discovered Door Controller devices as doors?`)) {
        return;
    }
    
    showLoading();
    
    try {
        // Load access groups for default assignment
        const accessGroupsResponse = await forceRefresh('/api/access-groups?limit=100');
        
        let defaultAccessGroupId = null;
        if (accessGroupsResponse.ok) {
            const accessGroupsData = await accessGroupsResponse.json();
            if (accessGroupsData.accessGroups.length > 0) {
                defaultAccessGroupId = accessGroupsData.accessGroups[0].id;
            }
        }
        
        // Add each Door Controller as a door
        const promises = discoveredControllers.map(controller => {
            const doorData = {
                name: `Door ${controller.mac.split(':').pop()}`,
                location: 'Building A, Floor 1',
                controllerIp: controller.ip,
                controllerMac: controller.mac,
                accessGroupId: defaultAccessGroupId
            };
            
            return fetch('/api/doors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(doorData)
            });
        });
        
        const results = await Promise.allSettled(promises);
        const successful = results.filter(result => result.status === 'fulfilled' && result.value.ok).length;
        const failed = results.length - successful;
        
        if (successful > 0) {
            // Success handled by webhook events - no duplicate toast needed
        }
        
        if (failed > 0) {
            app.showNotification(`Failed to add ${failed} Door Controller device(s)`, 'error');
        }
        
        // Clear the discovered list
        discoveredControllers = [];
        displayDiscoveredControllers();
        updateScanStatus('complete');
        document.getElementById('addAllBtn').style.display = 'none';
        
        // Refresh the doors page if it's currently active
        if (document.getElementById('doorsSection').classList.contains('active')) {
            loadDoors();
        }
        
    } catch (error) {
        console.error('Add all Door Controllers error:', error);
        app.showNotification('Failed to add Door Controller devices', 'error');
    } finally {
        hideLoading();
    }
}


async function saveDoorControllerConfiguration() {
    const form = document.getElementById('doorControllerConfigForm');
    const formData = new FormData(form);
    
    const configData = {
        name: formData.get('name'),
        mac: formData.get('mac'),
        ip: formData.get('ip'),
        accessGroupId: parseInt(formData.get('accessGroupId')),
        location: formData.get('location'),
        description: formData.get('description')
    };
    
    // Validate required fields
    if (!configData.name || !configData.accessGroupId) {
        app.showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        showLoading();
        
        // Create a new door with the Door Controller configuration
        const response = await fetch('/api/doors', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                name: configData.name,
                location: configData.location,
                description: configData.description,
                controllerIp: configData.ip,
                controllerMac: configData.mac,
                accessGroupId: configData.accessGroupId
            })
        });
        
        if (response.ok) {
            closeModal('doorControllerConfigModal');
            
            // Refresh the doors list if we're on that page
            if (currentSection === 'doors') {
                loadDoors();
            }
        } else {
            const error = await response.json();
            app.showNotification(error.message || 'Failed to configure Door Controller device', 'error');
        }
    } catch (error) {
        console.error('Failed to configure Door Controller device:', error);
        app.showNotification('Failed to configure Door Controller device', 'error');
    } finally {
        hideLoading();
    }
}

// Periodic door status updates
let doorStatusInterval;
let siteMapStatusInterval;

function startDoorStatusUpdates() {
    // Update door status every 2 seconds for maximum responsiveness
    doorStatusInterval = setInterval(() => {
        if (currentUser && hasRole('admin') && currentSection === 'doors') {
            refreshDoorStatus();
        }
        
        // Also update site map door status if on dashboard
        if (currentUser && hasRole('admin') && currentSection === 'dashboard' && sitePlanManager) {
            refreshSiteMapDoorStatus();
        }
    }, 2000); // Reduced from 10 seconds to 2 seconds
}

function stopDoorStatusUpdates() {
    if (doorStatusInterval) {
        clearInterval(doorStatusInterval);
    }
    if (siteMapStatusInterval) {
        clearInterval(siteMapStatusInterval);
    }
}

// Refresh only door status without loading indicators
async function refreshDoorStatus() {
    if (!currentUser || !hasRole('admin')) {
        return;
    }
    
    try {
        const params = new URLSearchParams({
            page: currentPage,
            limit: 10,
            ...currentFilters
        });
        
        const response = await forceRefresh(`/api/doors?${params}`);
        
        if (response.ok) {
            const data = await response.json();
            
            // Load tags for each door (same as in loadDoors)
            const doorsWithTags = await Promise.all(data.doors.map(async (door) => {
                try {
                    const tagsResponse = await forceRefresh(`/api/door-tags/door/${door.id}`);
                    
                    if (tagsResponse.ok) {
                        const tagsData = await tagsResponse.json();
                        door.tags = tagsData.doorTags || [];
                    } else {
                        door.tags = [];
                    }
                } catch (error) {
                    door.tags = [];
                }
                
                return door;
            }));
            
            displayDoors(doorsWithTags);
            // Don't refresh pagination during auto-updates
        }
    } catch (error) {
        console.error('Failed to refresh door status:', error);
        // Don't show error toast for background updates
    }
}

// Dedicated function for refreshing site map door status
async function refreshSiteMapDoorStatus() {
    if (!currentUser || !hasRole('admin') || !sitePlanManager) {
        return;
    }
    
    try {
        // Get fresh door data
        const response = await forceRefresh('/api/doors?limit=100');
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.doors && sitePlanManager.doors) {
                // Update site map door statuses
                data.doors.forEach(updatedDoor => {
                    const siteMapDoor = sitePlanManager.doors.find(d => d.id === updatedDoor.id);
                    if (siteMapDoor) {
                        // Update door properties
                        siteMapDoor.isOnline = updatedDoor.isOnline;
                        siteMapDoor.isOpen = updatedDoor.isOpen;
                        siteMapDoor.isLocked = updatedDoor.isLocked;
                        siteMapDoor.lastSeen = updatedDoor.lastSeen;
                        
        // Update status using the new logic
        const newStatus = sitePlanManager.getDoorStatus(updatedDoor);
        if (siteMapDoor.status !== newStatus) {
            const oldStatus = siteMapDoor.status;
            siteMapDoor.status = newStatus;
            console.log(`🔄 Site map door ${siteMapDoor.name} status updated: ${oldStatus} → ${newStatus}`);
            
            // Add visual feedback for status changes
            sitePlanManager.highlightDoorStatusChange(siteMapDoor, oldStatus, newStatus);
        }
                    }
                });
                
                // Redraw the site plan with updated statuses
                sitePlanManager.drawSitePlan();
            }
        }
    } catch (error) {
        console.error('Failed to refresh site map door status:', error);
    }
}

// Start aggressive polling for site map when active
function startSiteMapPolling() {
    // Clear existing interval
    if (siteMapStatusInterval) {
        clearInterval(siteMapStatusInterval);
    }
    
    // Poll every 1 second when site map is active
    siteMapStatusInterval = setInterval(() => {
        if (currentUser && hasRole('admin') && currentSection === 'dashboard' && sitePlanManager) {
            refreshSiteMapDoorStatus();
        }
    }, 1000); // 1 second polling for maximum responsiveness
}

// Stop site map polling
function stopSiteMapPolling() {
    if (siteMapStatusInterval) {
        clearInterval(siteMapStatusInterval);
        siteMapStatusInterval = null;
    }
}



// Event Log Functions
let currentEventPage = 1;
let currentEventType = '';
let currentEventFilters = {
    search: undefined,
    type: undefined,
    status: undefined
};
let eventRefreshInterval = null;
let eventSource = null;
let fetchStream = null;
let isEventStreamConnected = false;


// Keep-alive mechanism for Render instance
let keepAliveInterval = null;

function startKeepAlive() {
    // Multiple ping strategies for better keep-alive
    const pingEndpoints = ['/api/health', '/api/ping', '/api/status'];
    let currentEndpointIndex = 0;
    
    // Primary keep-alive (every 2 minutes)
    keepAliveInterval = setInterval(async () => {
        const endpoint = pingEndpoints[currentEndpointIndex];
        currentEndpointIndex = (currentEndpointIndex + 1) % pingEndpoints.length;
        
        try {
            const response = await fetch(addCacheBusting(endpoint), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                console.log(`🔄 Frontend keep-alive ping successful: ${endpoint}`);
(`Keep-alive ping successful: ${endpoint}`, 'info');
            } else {
                console.log(`⚠️ Frontend keep-alive ping failed: ${endpoint} (${response.status})`);
(`Keep-alive ping failed: ${endpoint} (${response.status})`, 'warning');
            }
        } catch (error) {
            console.log(`❌ Frontend keep-alive ping error: ${endpoint} - ${error.message}`);
        }
    }, 5 * 60 * 1000); // 5 minutes - reduced frequency to fix SSE timeout
    
    // Disabled aggressive ping to reduce server load and fix SSE timeout
    console.log('🔄 Aggressive ping disabled to reduce server load');
('Aggressive ping disabled to reduce server load', 'info');
    
    // Store null interval for cleanup
    window.aggressiveKeepAliveInterval = null;
    
    console.log('🔄 Frontend keep-alive mechanism started (5min only)');
('Frontend keep-alive started (5min only)', 'info');
}

function stopKeepAlive() {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
    }
    
    if (window.aggressiveKeepAliveInterval) {
        clearInterval(window.aggressiveKeepAliveInterval);
        window.aggressiveKeepAliveInterval = null;
    }
    
    console.log('🔄 Frontend keep-alive mechanism stopped');
('Frontend keep-alive stopped', 'info');
}

async function loadEvents(page = 1, type = '') {
    try {
        console.log('Loading events - page:', page, 'type:', type);
        
        const params = new URLSearchParams({
            page: page,
            limit: 20
        });
        
        if (type) {
            params.append('type', type);
        }
        
        // Add search parameter if available
        if (currentEventFilters.search) {
            params.append('search', currentEventFilters.search);
        }
        
        // Add status filter if available
        if (currentEventFilters.status) {
            params.append('status', currentEventFilters.status);
        }
        
        const response = await forceRefresh(`/api/events?${params}`);
        
        console.log('Events response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Events data received:', data);
            displayEvents(data.events);
            displayEventPagination(data.pagination);
            currentEventPage = page;
            currentEventType = type;
            
            // Update refresh indicator
        } else {
            const errorData = await response.json();
            console.error('Failed to load events:', errorData);
        }
    } catch (error) {
        console.error('Load events error:', error);
    }
}


function displayEvents(events) {
    const eventLog = document.getElementById('eventLog');
    
    if (!events || events.length === 0) {
        eventLog.innerHTML = `
            <div class="event-log-empty">
                <i class="fas fa-history"></i>
                <h3>No Events Found</h3>
                <p>No events match your current filter criteria.</p>
            </div>
        `;
        return;
    }
    
    eventLog.innerHTML = events.map((event, index) => {
        const isLongDescription = event.details && event.details.length > 100;
        const truncatedDetails = isLongDescription ? event.details.substring(0, 100) + '...' : event.details;
        
        return `
        <div class="event-item">
            <div class="event-icon ${event.type} ${getEventStatusClass(event.type, event.action)}">
                <i class="fas ${getEventIcon(event.type)}"></i>
            </div>
            <div class="event-content">
                <div class="event-main">
                    <div class="event-header">
                        <span class="event-action">${formatEventAction(event.action)}</span>
                        <span class="event-entity">${event.entityName || 'System'}</span>
                    </div>
                    <div class="event-details-container">
                        <div class="event-details ${isLongDescription ? 'truncated' : ''}" data-full-text="${event.details || ''}">
                            ${isLongDescription ? truncatedDetails : event.details}
                        </div>
                        ${isLongDescription ? `
                            <button class="event-details-toggle" onclick="toggleEventDetails(${index})" aria-label="Toggle full description">
                                <i class="fas fa-chevron-down"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="event-meta">
                    <div class="event-user">
                        <i class="fas fa-user"></i>
                        <span>${event.userName}</span>
                    </div>
                    <div class="event-time">
                        <i class="fas fa-clock"></i>
                        <span>${formatEventTime(event.createdAt)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    }).join('');
}

function displayEventPagination(pagination) {
    const paginationDiv = document.getElementById('eventPagination');
    
    if (pagination.totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    let paginationHTML = '<div class="pagination">';
    
    // Previous button
    paginationHTML += `
        <button ${pagination.currentPage === 1 ? 'disabled' : ''} 
                onclick="loadEvents(${pagination.currentPage - 1}, '${currentEventFilters.type || ''}')">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // Page numbers
    const startPage = Math.max(1, pagination.currentPage - 2);
    const endPage = Math.min(pagination.totalPages, pagination.currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="${i === pagination.currentPage ? 'active' : ''}" 
                    onclick="loadEvents(${i}, '${currentEventFilters.type || ''}')">
                ${i}
            </button>
        `;
    }
    
    // Next button
    paginationHTML += `
        <button ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''} 
                onclick="loadEvents(${pagination.currentPage + 1}, '${currentEventFilters.type || ''}')">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    paginationHTML += '</div>';
    paginationDiv.innerHTML = paginationHTML;
}

function searchEvents() {
    const searchTerm = document.getElementById('eventSearchInput').value;
    currentEventFilters.search = searchTerm || undefined;
    loadEvents(1, currentEventFilters.type);
}

function filterEvents() {
    const typeFilter = document.getElementById('eventTypeFilter');
    const statusFilter = document.getElementById('eventStatusFilter');
    
    currentEventFilters.type = typeFilter.value || undefined;
    currentEventFilters.status = statusFilter.value || undefined;
    
    loadEvents(1, currentEventFilters.type);
}

function startEventRefresh() {
    // Event refresh disabled - using polling system instead
    console.log('🔄 Event refresh disabled - using polling system');
    return;
    
    // Clear existing interval
    if (eventRefreshInterval) {
        clearInterval(eventRefreshInterval);
    }
    
    // Start new interval - refresh every 3 seconds for better responsiveness
    eventRefreshInterval = setInterval(() => {
        // Only refresh if we're on the site map and events are visible
        const dashboardSection = document.getElementById('dashboardSection');
        if (dashboardSection && dashboardSection.classList.contains('active')) {
            loadEvents(currentEventPage, currentEventFilters.type || '');
        }
    }, 3000); // Reduced from 10 seconds to 3 seconds
}

function stopEventRefresh() {
    if (eventRefreshInterval) {
        clearInterval(eventRefreshInterval);
        eventRefreshInterval = null;
    }
}

// Server-Sent Events (SSE) functions for live updates
// Fetch streaming fallback function
function startFetchStreaming(url) {
    console.log('🔄 Starting fetch streaming fallback...');
    console.log('🔄 Fetch streaming URL:', url);
('Starting fetch streaming fallback', 'info');
    
    // Close existing EventSource
    if (eventSource) {
        console.log('🔄 Closing existing EventSource before fetch streaming');
        eventSource.close();
        eventSource = null;
    }
    
    console.log('🔄 Making fetch request to:', url);
    fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache'
        }
    })
    .then(response => {
        console.log('🔄 Fetch response received:', response.status, response.statusText);
        console.log('🔄 Response headers:', [...response.headers.entries()]);
        console.log('🔄 Response ok:', response.ok);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        console.log('✅ Fetch streaming connected');
('Fetch streaming connected', 'success');
        isEventStreamConnected = true;
        updateEventStreamStatus(true);
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        function readStream() {
            reader.read().then(({ done, value }) => {
                if (done) {
                    console.log('📡 Fetch stream ended');
('Fetch stream ended', 'warning');
                    isEventStreamConnected = false;
                    updateEventStreamStatus(false);
                    return;
                }
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));
                            handleEventStreamMessage(data);
                        } catch (error) {
                            console.error('Error parsing fetch stream data:', error);
                        }
                    }
                }
                
                readStream();
            }).catch(error => {
                console.error('❌ Fetch stream error:', error);
(`Fetch stream error: ${error.message}`, 'error');
                isEventStreamConnected = false;
                updateEventStreamStatus(false);
            });
        }
        
        readStream();
    })
    .catch(error => {
        console.error('❌ Fetch streaming failed:', error);
(`Fetch streaming failed: ${error.message}`, 'error');
        isEventStreamConnected = false;
        updateEventStreamStatus(false);
    });
}

function connectEventStream() {
    console.log('🔄 connectEventStream() called - DISABLED (using polling instead)');
('SSE connection disabled - using polling system', 'info');
    
    // SSE is disabled - using polling system instead
    console.log('📡 SSE disabled, using UserEventPoller for real-time updates');
    return;
    
    // Clear any cached connections
    console.log('🧹 Clearing any cached connections...');
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
    if (fetchStream) {
        fetchStream = null;
    }
    
    // Reset reconnection attempts counter
    window.sseReconnectAttempts = 0;
    
    console.log('🔗 Testing EventSource directly with public endpoint...');
    
    // Test EventSource directly with main public endpoint - bypass all complex logic
    const testUrl = `/api/events/stream-public?_cb=${Date.now()}&_r=${Math.random().toString(36).substr(2, 9)}`;
    console.log('📡 Test EventSource URL:', testUrl);
    
    // Create EventSource directly - no fetch tests, no complex logic
    console.log('🔄 Creating EventSource directly for public endpoint...');
    eventSource = new EventSource(testUrl);
    
    // Add immediate logging
    console.log('📡 EventSource created, readyState:', eventSource.readyState);
    console.log('📡 EventSource URL property:', eventSource.url);
    console.log('📡 EventSource withCredentials:', eventSource.withCredentials);
(`EventSource created for public endpoint, readyState: ${eventSource.readyState}`, 'info');
    
    // Add timeout to detect connection issues
    const connectionTimeout = setTimeout(() => {
        console.log('⏰ SSE timeout reached - checking connection state...');
        
        if (!eventSource) {
            console.log('❌ EventSource is null - cannot check connection state');
('EventSource is null - connection failed', 'error');
            return;
        }
        
        console.log('⏰ EventSource readyState:', eventSource.readyState);
        console.log('⏰ EventSource URL:', eventSource.url);
        
        if (eventSource.readyState !== 1) {
            console.log('⏰ SSE connection timeout - readyState still:', eventSource.readyState);
(`SSE connection timeout - readyState: ${eventSource.readyState}`, 'warning');
            
            // Try fetch streaming fallback
            console.log('🔄 Attempting fetch streaming fallback...');
            if (eventSource && eventSource.url) {
                console.log('🔄 EventSource URL for fetch streaming:', eventSource.url);
('Attempting fetch streaming fallback', 'info');
                startFetchStreaming(eventSource.url);
            } else {
                console.log('❌ Cannot start fetch streaming - EventSource URL not available');
('Cannot start fetch streaming - EventSource URL not available', 'error');
            }
        } else {
            console.log('✅ EventSource connected successfully before timeout');
('EventSource connected successfully', 'success');
        }
    }, 10000); // 10 second timeout
    
            eventSource.onopen = function(event) {
                clearTimeout(connectionTimeout);
                console.log('✅ Event stream connected successfully - PUBLIC ENDPOINT');
                console.log('✅ Event object:', event);
                console.log('✅ EventSource readyState:', eventSource.readyState);
                console.log('✅ EventSource URL:', eventSource.url);
('SSE connection established successfully - PUBLIC ENDPOINT', 'success');
        isEventStreamConnected = true;
        updateEventStreamStatus(true);
        
        // Clear any existing reconnection attempts
        if (window.sseReconnectAttempts) {
            window.sseReconnectAttempts = 0;
        }
        
        // Start periodic health check for Railway sleep/wake detection
        startSSEHealthCheck();
        
        // Ensure status stays connected
        setTimeout(() => {
            if (isEventStreamConnected) {
                updateEventStreamStatus(true);
            }
        }, 1000);
    };
    
            eventSource.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    console.log('Received event stream data - PUBLIC ENDPOINT:', data);
(`Received event from public endpoint: ${data.type}`, 'info');
                    
                    if (data.type === 'connection') {
                        console.log('✅ Connection message received from public endpoint');
('Connection message received from public endpoint', 'success');
                    } else if (data.type === 'test') {
                        console.log('✅ Test message received from public endpoint');
('Test message received from public endpoint', 'success');
                    } else if (data.type === 'heartbeat') {
                        console.log('✅ Heartbeat received from public endpoint');
('Heartbeat received from public endpoint', 'info');
                        
                        // Update site plan door status if heartbeat contains door info
                        if (sitePlanManager && data.doorId && typeof sitePlanManager.updateDoorFromHeartbeat === 'function') {
                            console.log('🔄 Updating site plan door status from heartbeat');
                            sitePlanManager.updateDoorFromHeartbeat(data);
                        }
                    } else if (data.type === 'event') {
                        console.log('✅ Live event received from public endpoint:', data.event);
                        console.log('Event details - Type:', data.event.type, 'Action:', data.event.action, 'Entity:', data.event.entityName, 'ID:', data.event.entityId);
(`Live event received: ${data.event.type} ${data.event.action} - ${data.event.entityName}`, 'success');
                        
                        // Show a visual indicator that a new event was received
                        const eventLog = document.getElementById('eventLog');
                        if (eventLog) {
                            eventLog.style.borderLeft = '4px solid #28a745';
                            setTimeout(() => {
                                eventLog.style.borderLeft = '';
                            }, 2000);
                        }
                        
                        // SSE event handling disabled - using polling system instead
                        console.log('📡 SSE event handling disabled - using polling system');
                        
                        // Update other sections if needed
                        if (data.event.type === 'user' && typeof loadUsers === 'function') {
                            console.log('🔄 Refreshing users list due to user event');
                            loadUsers();
                        } else if (data.event.type === 'door' && typeof loadDoors === 'function') {
                            console.log('🔄 Refreshing doors list due to door event');
                            loadDoors();
                            
                            // Update site plan door status if site plan is active
                            if (sitePlanManager && typeof sitePlanManager.updateDoorStatus === 'function') {
                                console.log('🔄 Updating site plan door status due to door event');
                                console.log('Door event data:', data.event);
                                sitePlanManager.updateDoorStatus(data.event);
                            }
                        }
                    } else if (data.type === 'new_event') {
                        console.log('✅ New event received from public endpoint:', data);
                        console.log('New event details:', data.event);
(`New event received: ${data.type}`, 'success');
                        
                        // Show a visual indicator that a new event was received
                        const eventLog = document.getElementById('eventLog');
                        if (eventLog) {
                            eventLog.style.borderLeft = '4px solid #28a745';
                            setTimeout(() => {
                                eventLog.style.borderLeft = '';
                            }, 2000);
                        }
                        
                        // SSE event handling disabled - using polling system instead
                        console.log('📡 SSE event handling disabled - using polling system');
                        
                        // Update site plan door status if this is a door event
                        if (data.event && data.event.type === 'door' && sitePlanManager && typeof sitePlanManager.updateDoorStatus === 'function') {
                            console.log('🔄 Updating site plan door status due to new door event');
                            console.log('New door event data:', data.event);
                            sitePlanManager.updateDoorStatus(data.event);
                        }
                        
                        // Update site plan door status if this is an access event
                        if (data.event && data.event.type === 'access' && data.event.action === 'granted' && sitePlanManager && typeof sitePlanManager.updateDoorStatus === 'function') {
                            console.log('🔄 Updating site plan door status due to access granted event');
                            console.log('Access granted event data:', data.event);
                            
                            // For access events, we need to find the door ID from the event details or use a default
                            // Since access events don't contain door ID directly, we'll update all doors or find by IP
                            const accessEvent = data.event;
                            
                            // Try to extract door ID from event details or use first door as fallback
                            let targetDoorId = null;
                            
                            // Check if event details contain door information
                            if (accessEvent.details && accessEvent.details.includes('IP:')) {
                                const ipMatch = accessEvent.details.match(/IP:\s*(\d+\.\d+\.\d+\.\d+)/);
                                if (ipMatch) {
                                    const ip = ipMatch[1];
                                    // Find door by IP
                                    const doorByIp = sitePlanManager.doors.find(door => door.ip === ip);
                                    if (doorByIp) {
                                        targetDoorId = doorByIp.id;
                                        console.log(`Found door by IP ${ip}:`, doorByIp.name, 'ID:', doorByIp.id);
                                    }
                                }
                            }
                            
                            // If no door found by IP, use the first door as fallback
                            if (!targetDoorId && sitePlanManager.doors.length > 0) {
                                targetDoorId = sitePlanManager.doors[0].id;
                                console.log('Using first door as fallback:', sitePlanManager.doors[0].name, 'ID:', targetDoorId);
                            }
                            
                            if (targetDoorId) {
                                // Convert access event to door event format
                                const doorEvent = {
                                    ...accessEvent,
                                    type: 'door',
                                    action: 'access_granted',
                                    entityId: targetDoorId,
                                    id: targetDoorId
                                };
                                sitePlanManager.updateDoorStatus(doorEvent);
                            } else {
                                console.log('No doors available in site plan for access event');
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error parsing event stream data:', error);
(`Error parsing event data: ${error.message}`, 'error');
                }
            };
    
    eventSource.onerror = function(event) {
        console.error('❌ Event stream error - PUBLIC ENDPOINT:', event);
        console.error('❌ Error details:');
        
        if (!eventSource) {
            console.error('❌ EventSource is null in error handler');
('EventSource is null in error handler', 'error');
            return;
        }
        
        console.error('  - EventSource readyState:', eventSource.readyState);
        console.error('  - EventSource URL:', eventSource.url);
        console.error('  - EventSource withCredentials:', eventSource.withCredentials);
        console.error('  - Error event type:', event.type);
        console.error('  - Error event target:', event.target);
        console.error('  - Current page URL:', window.location.href);
        console.error('  - User agent:', navigator.userAgent);
        
(`SSE error occurred on public endpoint: readyState=${eventSource.readyState}`, 'error');
        
        // Try to get more info about the error
        if (eventSource.readyState === 0) {
            console.error('❌ EventSource stuck in CONNECTING state - likely network/CORS issue');
('EventSource stuck in CONNECTING state on public endpoint', 'error');
            
            // Try fetch streaming fallback immediately
            console.log('🔄 Attempting fetch streaming fallback...');
            if (eventSource && eventSource.url) {
                console.log('🔄 EventSource URL for fetch streaming:', eventSource.url);
('Attempting fetch streaming fallback', 'info');
                startFetchStreaming(eventSource.url);
            } else {
                console.log('❌ Cannot start fetch streaming - EventSource URL not available');
('Cannot start fetch streaming - EventSource URL not available', 'error');
            }
        } else if (eventSource.readyState === 2) {
            console.error('❌ EventSource CLOSED - connection was established but closed');
('EventSource connection was closed on public endpoint', 'error');
        }
        
        // Clear the timeout since we got an error
        clearTimeout(connectionTimeout);
        
        // Only mark as disconnected if readyState is CLOSED (2)
        if (eventSource.readyState === 2) {
            console.log('📡 Connection closed, marking as disconnected');
('SSE connection closed, marking as disconnected', 'warning');
            isEventStreamConnected = false;
            updateEventStreamStatus(false);
            
            // Attempt to reconnect with exponential backoff for Railway sleep/wake cycles
            if (!window.sseReconnectAttempts) {
                window.sseReconnectAttempts = 0;
            }
            
            const maxReconnectAttempts = 10;
            
            const attemptReconnect = () => {
                if (!isEventStreamConnected && window.sseReconnectAttempts < maxReconnectAttempts) {
                    window.sseReconnectAttempts++;
                    const delay = Math.min(1000 * Math.pow(2, window.sseReconnectAttempts), 30000); // Max 30 seconds
                    
                    console.log(`🔄 Attempting to reconnect event stream (attempt ${window.sseReconnectAttempts}/${maxReconnectAttempts}) in ${delay}ms...`);
(`Attempting to reconnect SSE (attempt ${window.sseReconnectAttempts}/${maxReconnectAttempts})`, 'info');
                    
                    setTimeout(() => {
                        if (!isEventStreamConnected) {
                            connectEventStream();
                        }
                    }, delay);
                } else if (window.sseReconnectAttempts >= maxReconnectAttempts) {
                    console.log('❌ Max reconnection attempts reached, giving up');
('Max SSE reconnection attempts reached', 'error');
                }
            };
            
            attemptReconnect();
        } else {
            console.log('📡 Connection error but still open, keeping status as connected');
('SSE error but connection still open, keeping status', 'warning');
        }
    };
}


function disconnectEventStream() {
    if (eventSource) {
        eventSource.close();
        eventSource = null;
        isEventStreamConnected = false;
        updateEventStreamStatus(false);
('SSE connection manually disconnected', 'info');
        console.log('Event stream disconnected');
    }
    
    // Stop health check
    if (window.sseHealthCheckInterval) {
        clearInterval(window.sseHealthCheckInterval);
        window.sseHealthCheckInterval = null;
    }
}

// SSE Health Check for cloud platform sleep/wake cycles
function startSSEHealthCheck() {
    // Clear any existing health check
    if (window.sseHealthCheckInterval) {
        clearInterval(window.sseHealthCheckInterval);
    }
    
    // Check every 30 seconds if SSE is still working
    window.sseHealthCheckInterval = setInterval(() => {
        if (!isEventStreamConnected || !eventSource || eventSource.readyState !== 1) {
            console.log('🔄 SSE health check failed, attempting reconnection...');
('SSE health check failed, reconnecting', 'warning');
            
            // Reset reconnection attempts for health check
            window.sseReconnectAttempts = 0;
            connectEventStream();
        } else {
            console.log('✅ SSE health check passed');
        }
    }, 30000); // Check every 30 seconds
    
    // Also check when page becomes visible again (user switches back to tab)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && !isEventStreamConnected) {
            console.log('🔄 Page became visible and SSE disconnected, reconnecting...');
('Page visible, reconnecting SSE', 'info');
            window.sseReconnectAttempts = 0;
            connectEventStream();
        }
    });
}

function addNewEventToList(event) {
    const eventLog = document.getElementById('eventLog');
    if (!eventLog) return;
    
    // Check if description is long
    const isLongDescription = event.details && event.details.length > 100;
    const truncatedDetails = isLongDescription ? event.details.substring(0, 100) + '...' : event.details;
    
    // Create new event element
    const newEventElement = document.createElement('div');
    newEventElement.className = 'event-item new-event';
    newEventElement.innerHTML = `
        <div class="event-icon ${event.type} ${getEventStatusClass(event.type, event.action)}">
            <i class="fas ${getEventIcon(event.type)}"></i>
        </div>
        <div class="event-content">
            <div class="event-main">
                <div class="event-header">
                    <span class="event-action">${formatEventAction(event.action)}</span>
                    <span class="event-entity">${event.entityName || 'System'}</span>
                </div>
                <div class="event-details-container">
                    <div class="event-details ${isLongDescription ? 'truncated' : ''}" data-full-text="${event.details || ''}">
                        ${isLongDescription ? truncatedDetails : event.details}
                    </div>
                    ${isLongDescription ? `
                        <button class="event-details-toggle" onclick="toggleEventDetails(0)" aria-label="Toggle full description">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
            <div class="event-meta">
                <div class="event-user">
                    <i class="fas fa-user"></i>
                    <span>${event.userName}</span>
                </div>
                <div class="event-time">
                    <i class="fas fa-clock"></i>
                    <span>${formatEventTime(event.createdAt)}</span>
                </div>
            </div>
        </div>
    `;
    
    // Add to top of event list
    const firstEvent = eventLog.querySelector('.event-item');
    if (firstEvent) {
        eventLog.insertBefore(newEventElement, firstEvent);
    } else {
        eventLog.appendChild(newEventElement);
    }
    
    // Add animation class
    setTimeout(() => {
        newEventElement.classList.remove('new-event');
    }, 1000);
    
    // Remove animation class after animation completes
    setTimeout(() => {
        newEventElement.classList.remove('new-event');
    }, 3000);
}

function updateEventStreamStatus(connected) {
    console.log(`📡 Updating event stream status: ${connected ? 'Live' : 'Offline'}`);
(`Updating status indicator: ${connected ? 'Live' : 'Offline'}`, 'info');
    
    const eventControls = document.querySelector('#eventsSection .header-actions');
    if (!eventControls) {
        console.log('❌ Event controls not found');
('Event controls element not found', 'error');
        return;
    }
    
    // Remove existing status indicator
    const existingStatus = eventControls.querySelector('.stream-status');
    if (existingStatus) {
        existingStatus.remove();
('Removed existing status indicator', 'info');
    }
    
    // Add new status indicator
    const statusElement = document.createElement('div');
    statusElement.className = `stream-status ${connected ? 'connected' : 'disconnected'}`;
    statusElement.innerHTML = `
        <i class="fas ${connected ? 'fa-wifi' : 'fa-wifi-slash'}"></i>
        <span>${connected ? 'Live' : 'Offline'}</span>
    `;
    
    eventControls.appendChild(statusElement);
    console.log(`✅ Status indicator added: ${connected ? 'Live' : 'Offline'}`);
(`Status indicator added to DOM: ${connected ? 'Live' : 'Offline'}`, 'success');
    
    // Force a re-render by adding a small delay and checking
    setTimeout(() => {
        const checkStatus = eventControls.querySelector('.stream-status');
        if (checkStatus) {
            console.log(`✅ Status confirmed in DOM: ${checkStatus.textContent.trim()}`);
(`Status confirmed in DOM: ${checkStatus.textContent.trim()}`, 'success');
        } else {
            console.log('❌ Status indicator not found in DOM after creation');
('Status indicator not found in DOM after creation', 'error');
        }
    }, 100);
}

function getEventIcon(type) {
    const icons = {
        'user': 'fa-user',
        'door': 'fa-door-open',
        'access_group': 'fa-shield-alt',
        'auth': 'fa-key',
        'access': 'fa-unlock',
        'error': 'fa-exclamation-triangle',
        'system': 'fa-cog'
    };
    return icons[type] || 'fa-info-circle';
}

function getEventStatusClass(type, action) {
    // Door online/offline status
    if (type === 'door') {
        if (action === 'online') return 'status-online';
        if (action === 'offline') return 'status-offline';
        return 'status-info'; // Other door actions
    }
    
    // Access granted/denied status
    if (type === 'access') {
        if (action === 'granted') return 'status-granted';
        if (action === 'denied') return 'status-denied';
        return 'status-info'; // Other access actions
    }
    
    // Auth events - use warning color for security-related events
    if (type === 'auth') {
        return 'status-warning';
    }
    
    // Error events - use error color
    if (type === 'error') {
        return 'status-error';
    }
    
    // User events - use info color
    if (type === 'user') {
        return 'status-info';
    }
    
    // System events - use neutral color
    if (type === 'system') {
        return 'status-neutral';
    }
    
    // Access group events - use info color
    if (type === 'access_group') {
        return 'status-info';
    }
    
    // Default to info for unknown types
    return 'status-info';
}

function formatEventAction(action) {
    const actions = {
        'created': 'Created',
        'updated': 'Updated',
        'deleted': 'Deleted',
        'login': 'Logged In',
        'logout': 'Logged Out',
        'granted': 'Access Granted',
        'denied': 'Access Denied',
        'door_added': 'Door Added',
        'door_removed': 'Door Removed',
        'user_added': 'User Added',
        'user_removed': 'User Removed',
        'occurred': 'Error Occurred'
    };
    return actions[action] || action;
}

function formatEventTime(timestamp) {
    // Handle timezone issue - database stores UTC time but we need local time
    let date;
    if (timestamp.includes(' ')) {
        // If it's in format "YYYY-MM-DD HH:mm:ss", treat as UTC and convert to local
        // Add 'Z' to indicate UTC, then JavaScript will convert to local timezone
        date = new Date(timestamp + 'Z');
    } else {
        date = new Date(timestamp);
    }
    
    // Format as actual date and time
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = date.toDateString() === new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();
    
    if (isToday) {
        // Show time only for today's events
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (isYesterday) {
        // Show "Yesterday" + time for yesterday's events
        return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
        // Show full date and time for older events
        return date.toLocaleString([], { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
}

// Toggle event details expansion
function toggleEventDetails(index) {
    const eventItems = document.querySelectorAll('.event-item');
    const eventItem = eventItems[index];
    if (!eventItem) return;
    
    const detailsContainer = eventItem.querySelector('.event-details-container');
    const detailsElement = eventItem.querySelector('.event-details');
    const toggleButton = eventItem.querySelector('.event-details-toggle');
    const icon = toggleButton.querySelector('i');
    
    if (detailsElement.classList.contains('truncated')) {
        // Expand
        detailsElement.classList.remove('truncated');
        detailsElement.textContent = detailsElement.getAttribute('data-full-text');
        icon.className = 'fas fa-chevron-up';
        toggleButton.setAttribute('aria-label', 'Collapse description');
    } else {
        // Collapse
        const fullText = detailsElement.getAttribute('data-full-text');
        const truncatedText = fullText.substring(0, 100) + '...';
        detailsElement.classList.add('truncated');
        detailsElement.textContent = truncatedText;
        icon.className = 'fas fa-chevron-down';
        toggleButton.setAttribute('aria-label', 'Expand description');
    }
}


// Site Plan Functionality
class SitePlanManager {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.doors = [];
        this.editMode = false;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.lastPanPoint = { x: 0, y: 0 };
        this.isPinching = false;
        this.lastPinchDistance = 0;
        this.lastPinchCenter = { x: 0, y: 0 };
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.draggedDoor = null;
        this.sitePlanImage = null;
        this.doorIconSize = 20;
        this.doorsLoaded = false;
    }

    init() {
        this.canvas = document.getElementById('sitePlanCanvas');
        if (!this.canvas) {
            console.error('Site plan canvas not found!');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.setupEventListeners();
        
        // Ensure canvas is properly sized
        this.resizeCanvas();
        
        // Don't load doors automatically - wait for site map section to be shown
        this.drawSitePlan(); // Just draw empty canvas initially
        
        console.log('Site plan initialized with canvas:', this.canvas.width, 'x', this.canvas.height);
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        // Set canvas size to match container
        this.canvas.width = Math.max(800, rect.width - 20);
        this.canvas.height = Math.max(600, rect.height - 20);
        
        // Set CSS size for display
        this.canvas.style.width = this.canvas.width + 'px';
        this.canvas.style.height = this.canvas.height + 'px';
    }

    restoreBackgroundImage() {
        console.log('restoreBackgroundImage() called');
        // Try to load from server first
        this.loadSitePlanFromServer();
    }

    loadSitePlanFromServer() {
        const token = localStorage.getItem('token');
        
        console.log('Loading site plan from server...');
        console.log('Token exists:', !!token);
        
        fetch('/api/site-plan', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        })
        .then(response => {
            console.log('Site plan API response status:', response.status);
            if (response.ok) {
                return response.json();
            } else {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
        })
        .then(data => {
            console.log('Site plan API response data:', data);
            if (data.backgroundImage) {
                const img = new Image();
                img.onload = () => {
                    this.sitePlanImage = img;
        console.log('Site plan background loaded from server');
        console.log('Current doors in site plan:', this.doors.length, this.doors.map(d => ({id: d.id, name: d.name, status: d.status})));
        this.drawSitePlan(); // Draw the site plan after loading
                };
                // Add cache-busting parameter to image URL (only for HTTP URLs, not data URLs)
                if (data.backgroundImage.startsWith('data:')) {
                    img.src = data.backgroundImage; // Data URLs can't have query parameters
                } else {
                    const separator = data.backgroundImage.includes('?') ? '&' : '?';
                    img.src = data.backgroundImage + separator + 't=' + Date.now();
                }
            } else {
                console.log('No site plan background found on server');
            }
        })
        .catch(error => {
            console.error('Error loading site plan from server:', error);
            // Fallback to localStorage
            const savedBackground = localStorage.getItem('sitePlanBackground');
            if (savedBackground) {
                const img = new Image();
                img.onload = () => {
                    this.sitePlanImage = img;
                    console.log('Site plan background loaded from localStorage fallback');
                    this.drawSitePlan(); // Draw the site plan after loading
                };
                // Add cache-busting parameter to localStorage image URL (only for HTTP URLs, not data URLs)
                if (savedBackground.startsWith('data:')) {
                    img.src = savedBackground; // Data URLs can't have query parameters
                } else {
                    const separator = savedBackground.includes('?') ? '&' : '?';
                    img.src = savedBackground + separator + 't=' + Date.now();
                }
            } else {
                console.log('No site plan background found in localStorage');
            }
        });
    }

    loadDoorPositionsFromServer(doorsArray) {
        const token = localStorage.getItem('token');
        
        fetch('/api/site-plan/positions', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
        })
        .then(data => {
            const savedPositions = data.positions || {};
            
            // Process each door with server positions
            doorsArray.forEach(door => {
                // Use saved position if available, otherwise use API position or default
                const savedPos = savedPositions[door.id];
                const x = savedPos ? savedPos.x : (door.position_x || door.x || 100 + (door.id * 50) % (this.canvas.width - 200));
                const y = savedPos ? savedPos.y : (door.position_y || door.y || 100 + (door.id * 30) % (this.canvas.height - 200));
                
                const processedDoor = {
                    id: door.id,
                    name: door.name || `Door ${door.id}`,
                    number: door.doorNumber || door.door_number || door.id,
                    status: this.getDoorStatus(door),
                    x: x,
                    y: y,
                    isOnline: door.isOnline,
                    isOpen: door.isOpen,
                    isLocked: door.isLocked,
                    location: door.location,
                    ipAddress: door.ipAddress || door.ip_address || door.controllerIp
                };
                this.doors.push(processedDoor);
            });
            
            this.drawSitePlan();
        })
        .catch(error => {
            // Fallback to localStorage
            const savedPositions = JSON.parse(localStorage.getItem('doorPositions') || '{}');
            
            // Process each door with localStorage positions
            doorsArray.forEach(door => {
                // Use saved position if available, otherwise use API position or default
                const savedPos = savedPositions[door.id];
                const x = savedPos ? savedPos.x : (door.position_x || door.x || 100 + (door.id * 50) % (this.canvas.width - 200));
                const y = savedPos ? savedPos.y : (door.position_y || door.y || 100 + (door.id * 30) % (this.canvas.height - 200));
                
                const processedDoor = {
                    id: door.id,
                    name: door.name || `Door ${door.id}`,
                    number: door.doorNumber || door.door_number || door.id,
                    status: this.getDoorStatus(door),
                    x: x,
                    y: y,
                    isOnline: door.isOnline,
                    isOpen: door.isOpen,
                    isLocked: door.isLocked,
                    location: door.location,
                    ipAddress: door.ipAddress || door.ip_address || door.controllerIp
                };
                this.doors.push(processedDoor);
            });
            
            this.drawSitePlan();
        });
    }


    setupEventListeners() {
        // Canvas mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        // Window resize
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.drawSitePlan();
        });
        
        // Prevent context menu on long press (mobile)
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        
        // Convert to canvas coordinates accounting for zoom and pan
        const canvasX = (x - this.panX) / this.zoom;
        const canvasY = (y - this.panY) / this.zoom;
        
        // Adjust coordinates for centered image
        if (this.sitePlanImage) {
            const imageAspect = this.sitePlanImage.width / this.sitePlanImage.height;
            const canvasAspect = this.canvas.width / this.canvas.height;
            
            let offsetX, offsetY;
            if (imageAspect > canvasAspect) {
                offsetX = 0;
                offsetY = (this.canvas.height - (this.canvas.width / imageAspect)) / 2;
            } else {
                offsetX = (this.canvas.width - (this.canvas.height * imageAspect)) / 2;
                offsetY = 0;
            }
            
            x = canvasX - offsetX;
            y = canvasY - offsetY;
        } else {
            x = canvasX;
            y = canvasY;
        }
        
        if (this.editMode) {
            const door = this.getDoorAtPosition(x, y);
            if (door) {
                this.draggedDoor = door;
                this.isDragging = true;
                this.dragStart = { x, y };
            }
        } else {
            const door = this.getDoorAtPosition(x, y);
            if (door) {
                this.showDoorDetails(door);
            } else {
                // Start panning
                this.isPanning = true;
                this.lastPanPoint = { x: e.clientX, y: e.clientY };
                this.canvas.style.cursor = 'grabbing';
            }
        }
    }

    handleMouseMove(e) {
        if (this.isDragging && this.draggedDoor) {
            const rect = this.canvas.getBoundingClientRect();
            let x = e.clientX - rect.left;
            let y = e.clientY - rect.top;
            
            // Convert to canvas coordinates accounting for zoom and pan
            const canvasX = (x - this.panX) / this.zoom;
            const canvasY = (y - this.panY) / this.zoom;
            
            // Adjust coordinates for centered image
            if (this.sitePlanImage) {
                const imageAspect = this.sitePlanImage.width / this.sitePlanImage.height;
                const canvasAspect = this.canvas.width / this.canvas.height;
                
                let offsetX, offsetY;
                if (imageAspect > canvasAspect) {
                    offsetX = 0;
                    offsetY = (this.canvas.height - (this.canvas.width / imageAspect)) / 2;
                } else {
                    offsetX = (this.canvas.width - (this.canvas.height * imageAspect)) / 2;
                    offsetY = 0;
                }
                
                x = canvasX - offsetX;
                y = canvasY - offsetY;
            } else {
                x = canvasX;
                y = canvasY;
            }
            
            this.draggedDoor.x = x;
            this.draggedDoor.y = y;
            this.drawSitePlan();
        } else if (this.isPanning) {
            // Handle panning
            const deltaX = e.clientX - this.lastPanPoint.x;
            const deltaY = e.clientY - this.lastPanPoint.y;
            
            this.panX += deltaX;
            this.panY += deltaY;
            
            this.lastPanPoint = { x: e.clientX, y: e.clientY };
            this.drawSitePlan();
        }
    }

    handleMouseUp(e) {
        if (this.isDragging && this.draggedDoor) {
            this.isDragging = false;
            this.draggedDoor = null;
        } else if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = 'grab';
        }
    }

    handleWheel(e) {
        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calculate zoom factor
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(5, this.zoom * zoomFactor));
        
        // Calculate zoom point relative to canvas
        const zoomPointX = (mouseX - this.panX) / this.zoom;
        const zoomPointY = (mouseY - this.panY) / this.zoom;
        
        // Adjust pan to keep zoom point under mouse
        this.panX = mouseX - zoomPointX * newZoom;
        this.panY = mouseY - zoomPointY * newZoom;
        this.zoom = newZoom;
        
        this.drawSitePlan();
    }

    handleTouchStart(e) {
        e.preventDefault();
        
        if (e.touches.length === 1) {
            // Single touch - handle door interaction or panning
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            let x = touch.clientX - rect.left;
            let y = touch.clientY - rect.top;
            
            // Convert to canvas coordinates accounting for zoom and pan
            const canvasX = (x - this.panX) / this.zoom;
            const canvasY = (y - this.panY) / this.zoom;
            
            // Adjust coordinates for centered image
            if (this.sitePlanImage) {
                const imageAspect = this.sitePlanImage.width / this.sitePlanImage.height;
                const canvasAspect = this.canvas.width / this.canvas.height;
                
                let offsetX, offsetY;
                if (imageAspect > canvasAspect) {
                    offsetX = 0;
                    offsetY = (this.canvas.height - (this.canvas.width / imageAspect)) / 2;
                } else {
                    offsetX = (this.canvas.width - (this.canvas.height * imageAspect)) / 2;
                    offsetY = 0;
                }
                
                x = canvasX - offsetX;
                y = canvasY - offsetY;
            } else {
                x = canvasX;
                y = canvasY;
            }
            
            if (this.editMode) {
                const door = this.getDoorAtPosition(x, y);
                if (door) {
                    this.draggedDoor = door;
                    this.isDragging = true;
                    this.dragStart = { x, y };
                    
                    // Haptic feedback
                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }
                }
            } else {
                const door = this.getDoorAtPosition(x, y);
                if (door) {
                    this.showDoorDetails(door);
                    
                    // Haptic feedback
                    if (navigator.vibrate) {
                        navigator.vibrate(25);
                    }
                } else {
                    // Start panning
                    this.isPanning = true;
                    this.lastPanPoint = { x: touch.clientX, y: touch.clientY };
                }
            }
        } else if (e.touches.length === 2) {
            // Two touches - prepare for pinch zoom
            this.isPinching = true;
            this.lastPinchDistance = this.getPinchDistance(e.touches);
            this.lastPinchCenter = this.getPinchCenter(e.touches);
        }
    }

    handleTouchMove(e) {
        e.preventDefault();
        
        if (e.touches.length === 1) {
            if (this.isDragging && this.draggedDoor) {
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                let x = touch.clientX - rect.left;
                let y = touch.clientY - rect.top;
                
                // Convert to canvas coordinates accounting for zoom and pan
                const canvasX = (x - this.panX) / this.zoom;
                const canvasY = (y - this.panY) / this.zoom;
                
                // Adjust coordinates for centered image
                if (this.sitePlanImage) {
                    const imageAspect = this.sitePlanImage.width / this.sitePlanImage.height;
                    const canvasAspect = this.canvas.width / this.canvas.height;
                    
                    let offsetX, offsetY;
                    if (imageAspect > canvasAspect) {
                        offsetX = 0;
                        offsetY = (this.canvas.height - (this.canvas.width / imageAspect)) / 2;
                    } else {
                        offsetX = (this.canvas.width - (this.canvas.height * imageAspect)) / 2;
                        offsetY = 0;
                    }
                    
                    x = canvasX - offsetX;
                    y = canvasY - offsetY;
                } else {
                    x = canvasX;
                    y = canvasY;
                }
                
                this.draggedDoor.x = x;
                this.draggedDoor.y = y;
                this.drawSitePlan();
            } else if (this.isPanning) {
                // Handle panning
                const touch = e.touches[0];
                const deltaX = touch.clientX - this.lastPanPoint.x;
                const deltaY = touch.clientY - this.lastPanPoint.y;
                
                this.panX += deltaX;
                this.panY += deltaY;
                
                this.lastPanPoint = { x: touch.clientX, y: touch.clientY };
                this.drawSitePlan();
            }
        } else if (e.touches.length === 2 && this.isPinching) {
            // Handle pinch zoom
            const currentDistance = this.getPinchDistance(e.touches);
            const currentCenter = this.getPinchCenter(e.touches);
            
            if (this.lastPinchDistance > 0) {
                const scale = currentDistance / this.lastPinchDistance;
                const newZoom = Math.max(0.1, Math.min(5, this.zoom * scale));
                
                // Calculate zoom point relative to canvas
                const rect = this.canvas.getBoundingClientRect();
                const zoomPointX = (currentCenter.x - rect.left - this.panX) / this.zoom;
                const zoomPointY = (currentCenter.y - rect.top - this.panY) / this.zoom;
                
                // Adjust pan to keep zoom point under fingers
                this.panX = currentCenter.x - rect.left - zoomPointX * newZoom;
                this.panY = currentCenter.y - rect.top - zoomPointY * newZoom;
                this.zoom = newZoom;
                
                this.drawSitePlan();
            }
            
            this.lastPinchDistance = currentDistance;
            this.lastPinchCenter = currentCenter;
        }
    }

    handleTouchEnd(e) {
        e.preventDefault();
        if (this.isDragging && this.draggedDoor) {
            this.isDragging = false;
            this.draggedDoor = null;
        } else if (this.isPanning) {
            this.isPanning = false;
        } else if (this.isPinching) {
            this.isPinching = false;
            this.lastPinchDistance = 0;
        }
    }

    getDoorAtPosition(x, y) {
        return this.doors.find(door => {
            const distance = Math.sqrt((door.x - x) ** 2 + (door.y - y) ** 2);
            return distance < 25; // Increased radius for better touch interaction
        });
    }

    getPinchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    getPinchCenter(touches) {
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2
        };
    }

    drawSitePlan() {
        if (!this.ctx) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply zoom and pan transformations
        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoom, this.zoom);
        
        // Draw site plan background
        if (this.sitePlanImage) {
            // Calculate center position for the image
            const imageAspect = this.sitePlanImage.width / this.sitePlanImage.height;
            const canvasAspect = this.canvas.width / this.canvas.height;
            
            let drawWidth, drawHeight, offsetX, offsetY;
            
            if (imageAspect > canvasAspect) {
                // Image is wider - fit to canvas width
                drawWidth = this.canvas.width;
                drawHeight = this.canvas.width / imageAspect;
                offsetX = 0;
                offsetY = (this.canvas.height - drawHeight) / 2;
            } else {
                // Image is taller - fit to canvas height
                drawHeight = this.canvas.height;
                drawWidth = this.canvas.height * imageAspect;
                offsetX = (this.canvas.width - drawWidth) / 2;
                offsetY = 0;
            }
            
            // Draw image centered in canvas
            this.ctx.drawImage(this.sitePlanImage, offsetX, offsetY, drawWidth, drawHeight);
        } else {
            // Default grid background
            this.drawGridBackground();
        }
        
        // Draw doors
        this.doors.forEach(door => {
            this.drawDoor(door);
        });
        
        this.ctx.restore();
    }

    drawGridBackground() {
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.strokeStyle = '#e9ecef';
        this.ctx.lineWidth = 1;
        
        // Draw grid
        for (let x = 0; x < this.canvas.width; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < this.canvas.height; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawDoor(door) {
        const radius = this.doorIconSize; // Use configurable door size
        const isDragging = this.draggedDoor === door;
        
        // Adjust door position for centered image
        let doorX = door.x;
        let doorY = door.y;
        
        if (this.sitePlanImage) {
            const imageAspect = this.sitePlanImage.width / this.sitePlanImage.height;
            const canvasAspect = this.canvas.width / this.canvas.height;
            
            let offsetX, offsetY;
            if (imageAspect > canvasAspect) {
                offsetX = 0;
                offsetY = (this.canvas.height - (this.canvas.width / imageAspect)) / 2;
            } else {
                offsetX = (this.canvas.width - (this.canvas.height * imageAspect)) / 2;
                offsetY = 0;
            }
            
            doorX += offsetX;
            doorY += offsetY;
        }
        
        // Set color and glow based on status
        let fillColor, glowColor, glowBlur;
        switch (door.status) {
            case 'closed':
                // Door online and closed = GREEN
                fillColor = '#22c55e';
                glowColor = 'rgba(34, 197, 94, 0.6)';
                glowBlur = 15;
                break;
            case 'open':
                // Door online and opened (relay triggered) = YELLOW
                fillColor = '#f59e0b';
                glowColor = 'rgba(245, 158, 11, 0.6)';
                glowBlur = 15;
                break;
            case 'offline':
                // Door offline = GREY
                fillColor = '#6b7280';
                glowColor = 'rgba(0, 0, 0, 0)'; // No glow
                glowBlur = 0;
                break;
            default:
                // Default to grey for unknown status
                fillColor = '#6b7280';
                glowColor = 'rgba(0, 0, 0, 0)'; // No glow
                glowBlur = 0;
        }
        
        // Draw glow effect (if any)
        if (glowBlur > 0) {
            this.ctx.shadowColor = glowColor;
            this.ctx.shadowBlur = glowBlur;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;
        } else {
            // Regular shadow for offline doors
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            this.ctx.shadowBlur = 4;
            this.ctx.shadowOffsetX = 2;
            this.ctx.shadowOffsetY = 2;
        }
        
        this.ctx.beginPath();
        this.ctx.arc(doorX, doorY, radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = fillColor;
        this.ctx.fill();
        
        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        // Border
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        // Highlight effect for status changes
        if (door.highlighted) {
            this.ctx.strokeStyle = door.highlightColor || '#007bff';
            this.ctx.lineWidth = 6;
            this.ctx.stroke();
            
            // Add pulsing effect
            this.ctx.strokeStyle = 'rgba(0, 123, 255, 0.3)';
            this.ctx.lineWidth = 12;
            this.ctx.stroke();
        }
        
        // Door number with better visibility
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(door.number || '?', door.x, door.y);
        
        // Dragging indicator
        if (isDragging) {
            this.ctx.strokeStyle = '#007bff';
            this.ctx.lineWidth = 4;
            this.ctx.stroke();
        }
        
        // Door name label below the circle
        this.ctx.fillStyle = '#333';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(door.name || 'Door', doorX, doorY + radius + 5);
    }

    loadDoorPositions() {
        // Prevent reloading if doors are already loaded
        if (this.doorsLoaded && this.doors.length > 0) {
            console.log('Doors already loaded, skipping reload');
            return;
        }
        
        console.log('Loading doors from API...');
        const token = localStorage.getItem('token');
        
        if (!token) {
            console.log('No token - showing no doors message');
            this.showNoDoorsMessage();
            return;
        }
        
        // Load doors from API with authentication - match existing system exactly
        const params = new URLSearchParams({
            limit: 100  // Get all doors for site plan
        });
        
        forceRefresh(`/api/doors?${params}`)
            .then(response => {
                console.log('API Response status:', response.status, response.statusText);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Raw API data:', data);
                
                // Use exact same format as existing system - data.doors
                const doorsArray = data.doors || [];
                console.log('Processed doors array:', doorsArray);
                console.log('Number of doors found:', doorsArray.length);
                
                // Clear any existing doors first
                this.doors = [];
                
                // Load saved positions from server
                this.loadDoorPositionsFromServer(doorsArray);
                
                console.log('Final doors array:', this.doors);
                console.log(`Successfully loaded ${this.doors.length} doors`);
                
                this.doorsLoaded = true;
                this.drawSitePlan();
            })
            .catch(error => {
                console.error('Error loading doors:', error);
                console.error('Error details:', error.message);
                this.showNoDoorsMessage();
            });
    }

    showNoDoorsMessage() {
        this.doors = [];
        this.drawSitePlan();
        
        // Show message on canvas
        this.ctx.fillStyle = '#6c757d';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('No doors configured in system', this.canvas.width / 2, this.canvas.height / 2 - 30);
        
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Configure doors in the Doors section first', this.canvas.width / 2, this.canvas.height / 2 + 10);
        
        this.ctx.font = '14px Arial';
        this.ctx.fillText('Then return here to position them on your site plan', this.canvas.width / 2, this.canvas.height / 2 + 40);
    }


    getDoorStatus(door) {
        // Door offline = grey
        if (!door.isOnline) return 'offline';
        
        // Door online and opened (relay triggered) = yellow
        if (door.isOpen) return 'open';
        
        // Door online and closed = green
        return 'closed';
    }

    showDoorDetails(door) {
        const panel = document.getElementById('doorDetailsPanel');
        const title = document.getElementById('doorDetailsTitle');
        const content = document.getElementById('doorDetailsContent');
        
        title.textContent = door.name;
        content.innerHTML = `
            <div class="door-detail-item">
                <span class="door-detail-label">Door Number:</span>
                <span class="door-detail-value">${door.number}</span>
            </div>
            <div class="door-detail-item">
                <span class="door-detail-label">Status:</span>
                <span class="door-detail-value">${door.status.toUpperCase()}</span>
            </div>
            <div class="door-detail-item">
                <span class="door-detail-label">Online:</span>
                <span class="door-detail-value">${door.isOnline ? 'Yes' : 'No'}</span>
            </div>
            <div class="door-detail-item">
                <span class="door-detail-label">Open:</span>
                <span class="door-detail-value">${door.isOpen ? 'Yes' : 'No'}</span>
            </div>
            <div class="door-detail-item">
                <span class="door-detail-label">Locked:</span>
                <span class="door-detail-value">${door.isLocked ? 'Yes' : 'No'}</span>
            </div>
        `;
        
        panel.style.display = 'block';
    }

    updateDoorStatus(doorId, status) {
        const door = this.doors.find(d => d.id === doorId);
        if (door) {
            door.status = status;
            this.drawSitePlan();
        }
    }

    saveDoorPositions() {
        console.log('Saving door positions...');
        const positions = this.doors.map(door => ({
            id: door.id,
            x: door.x,
            y: door.y
        }));
        
        console.log('Positions to save:', positions);
        
        const token = localStorage.getItem('token');
        
        // Save to server for multi-device sync
        fetch('/api/site-plan/positions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                positions: positions
            })
        })
        .then(response => {
            if (response.ok) {
                app.showNotification('Door positions saved to server!', 'success');
                console.log('Door positions saved to server');
            } else {
                throw new Error('Failed to save door positions to server');
            }
        })
        .catch(error => {
            console.error('Error saving positions to server:', error);
            app.showNotification('Error saving door positions to server', 'error');
            
            // Fallback to localStorage
            const positionsObj = {};
            positions.forEach(pos => {
                positionsObj[pos.id] = { x: pos.x, y: pos.y };
            });
            localStorage.setItem('doorPositions', JSON.stringify(positionsObj));
            app.showNotification('Door positions saved locally (server sync failed)', 'warning');
        });
        
        // Also save individual door positions to API for door management
        const savePromises = positions.map(position => {
            return fetch(`/api/doors/${position.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    x: position.x,
                    y: position.y,
                    position_x: position.x,
                    position_y: position.y
                })
            });
        });
        
        Promise.all(savePromises)
        .then(responses => {
            console.log('Individual door position save responses:', responses);
        })
        .catch(error => {
            console.error('Error saving individual door positions:', error);
        });
    }

    // Update door status from SSE events
    updateDoorStatus(event) {
        console.log('Updating door status from event:', event);
        
        // Try multiple ways to find the door ID
        let doorId = event.entityId || event.doorId || event.door_id || event.id;
        if (!doorId) {
            console.log('Invalid event data for door status update - no door ID found');
            console.log('Available event properties:', Object.keys(event));
            return;
        }

        // Find the door in our current doors array
        const doorIndex = this.doors.findIndex(door => door.id === doorId);
        if (doorIndex === -1) {
            console.log('Door not found in site plan:', doorId);
            console.log('Available doors in site plan:', this.doors.map(d => ({id: d.id, name: d.name})));
            console.log('Event details:', event);
            return;
        }

        // Update door status based on event action
        const door = this.doors[doorIndex];
        let newStatus = door.status;

        switch (event.action) {
            case 'access_granted':
                // Show yellow (open) status when relay is triggered
                newStatus = 'open';
                console.log(`Door ${door.name} status set to OPEN due to access granted`);
                
                // Reset to closed (green) after 5 seconds when relay stops
                setTimeout(() => {
                    if (this.doors[doorIndex] && this.doors[doorIndex].status === 'open') {
                        this.doors[doorIndex].status = 'closed';
                        this.drawSitePlan(); // Redraw to update status
                        console.log(`Door ${door.name} status reset to CLOSED after access granted`);
                    }
                }, 5000);
                break;
                
            case 'offline':
                // Door offline = grey
                newStatus = 'offline';
                break;
                
            case 'online':
                // Door coming online = green (closed)
                newStatus = 'closed';
                break;
                
            case 'door_opened':
            case 'door_open':
                // Door opened (relay triggered) = yellow
                newStatus = 'open';
                console.log(`Door ${door.name} status set to OPEN due to manual door control`);
                
                // Reset to closed after 5 seconds for manual opens
                setTimeout(() => {
                    if (this.doors[doorIndex] && this.doors[doorIndex].status === 'open') {
                        this.doors[doorIndex].status = 'closed';
                        this.doors[doorIndex].isOpen = false;
                        this.drawSitePlan(); // Redraw to update status
                        console.log(`Door ${door.name} status reset to CLOSED after manual open`);
                    }
                }, 5000);
                break;
                
            case 'door_closed':
            case 'door_close':
                // Door closed = green
                newStatus = 'closed';
                break;
                
            case 'door_unlocked':
                // Door unlocked = green (closed but unlocked)
                newStatus = 'closed';
                break;
                
            case 'locked':
            case 'unlocked':
                // Legacy status - convert to new system
                newStatus = 'closed'; // Both locked/unlocked are now "closed" (green)
                break;
        }

        // Update the door status
        if (newStatus !== door.status) {
            this.doors[doorIndex].status = newStatus;
            console.log(`Door ${door.name} status updated: ${door.status} -> ${newStatus}`);
            
            // Redraw the site plan to show the new status
            this.drawSitePlan();
        }
    }

    // Update door status from heartbeat events
    updateDoorFromHeartbeat(heartbeatData) {
        console.log('Updating door status from heartbeat:', heartbeatData);
        
        if (!heartbeatData || !heartbeatData.doorId) {
            console.log('Invalid heartbeat data for door status update');
            return;
        }

        // Find the door in our current doors array
        const doorIndex = this.doors.findIndex(door => door.id === heartbeatData.doorId);
        if (doorIndex === -1) {
            console.log('Door not found in site plan:', heartbeatData.doorId);
            return;
        }

        const door = this.doors[doorIndex];
        let newStatus = 'closed'; // Default to closed (green) if online

        // Determine status based on heartbeat data
        if (heartbeatData.status === 'offline' || heartbeatData.signal < -80) {
            newStatus = 'offline'; // Grey
        } else if (heartbeatData.doorOpen === true) {
            newStatus = 'open'; // Yellow
        } else {
            newStatus = 'closed'; // Green (online and closed)
        }

        // Update the door status
        if (newStatus !== door.status) {
            door.status = newStatus;
            console.log(`Door ${door.name} status updated from heartbeat: ${door.status} -> ${newStatus}`);
            
            // Redraw the site plan to show the new status
            this.drawSitePlan();
        }
    }

    // Test function to manually update door status (for debugging)
    testDoorStatusUpdate(doorId, status) {
        console.log(`Testing door status update - Door ID: ${doorId}, Status: ${status}`);
        
        const doorIndex = this.doors.findIndex(door => door.id === doorId);
        if (doorIndex === -1) {
            console.log('Door not found for test:', doorId);
            return;
        }

        const door = this.doors[doorIndex];
        const oldStatus = door.status;
        door.status = status;
        console.log(`Door ${door.name} status set to ${status} for testing`);
        
        // Add visual feedback
        this.highlightDoorStatusChange(door, oldStatus, status);
        
        // Redraw the site plan to show the new status
        this.drawSitePlan();
    }
    
    // Highlight door status changes with visual feedback
    highlightDoorStatusChange(door, oldStatus, newStatus) {
        // Add a temporary highlight effect
        door.highlighted = true;
        door.highlightColor = this.getStatusHighlightColor(newStatus);
        
        // Redraw immediately to show the highlight
        this.drawSitePlan();
        
        // Remove highlight after animation
        setTimeout(() => {
            door.highlighted = false;
            this.drawSitePlan();
        }, 1000); // 1 second highlight
    }
    
    // Get highlight color for status changes
    getStatusHighlightColor(status) {
        switch (status) {
            case 'closed':
                return '#22c55e'; // Green
            case 'open':
                return '#f59e0b'; // Yellow
            case 'offline':
                return '#6b7280'; // Grey
            default:
                return '#6b7280';
        }
    }
}

// Global site plan manager
const sitePlanManager = new SitePlanManager();

// Global test functions for debugging door status
window.testDoorStatus = function(doorId, status) {
    console.log(`Testing door status update - Door ID: ${doorId}, Status: ${status}`);
    if (sitePlanManager) {
        sitePlanManager.testDoorStatusUpdate(doorId, status);
    } else {
        console.log('Site plan manager not available');
    }
};

// Global function to show current door statuses
window.showDoorStatuses = function() {
    if (sitePlanManager && sitePlanManager.doors) {
        console.log('Current door statuses on site map:');
        sitePlanManager.doors.forEach(door => {
            console.log(`- Door ${door.id} (${door.name}): ${door.status} (${door.isOnline ? 'online' : 'offline'})`);
        });
    } else {
        console.log('Site plan manager or doors not available');
    }
};

window.showDoorInfo = function() {
    if (sitePlanManager && sitePlanManager.doors) {
        console.log('Current doors in site plan:');
        sitePlanManager.doors.forEach((door, index) => {
            console.log(`${index + 1}. ID: ${door.id}, Name: ${door.name}, Status: ${door.status}`);
        });
    } else {
        console.log('No doors loaded in site plan');
    }
};

// Site Plan Functions
function uploadSitePlan() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    sitePlanManager.sitePlanImage = img;
                    
                    // Save to server for multi-device sync
                    saveSitePlanToServer(e.target.result);
                    
                    sitePlanManager.drawSitePlan();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

function saveSitePlanToServer(imageData) {
    const token = localStorage.getItem('token');
    
    fetch('/api/site-plan', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            backgroundImage: imageData
        })
    })
    .then(response => {
        if (response.ok) {
            app.showNotification('Site plan uploaded and saved to server!', 'success');
            console.log('Site plan background saved to server');
        } else {
            throw new Error('Failed to save site plan to server');
        }
    })
    .catch(error => {
        console.error('Error saving site plan:', error);
        app.showNotification('Error saving site plan to server', 'error');
        
        // Fallback to localStorage
        localStorage.setItem('sitePlanBackground', imageData);
        app.showNotification('Site plan saved locally (server sync failed)', 'warning');
    });
}

function toggleEditMode() {
    sitePlanManager.editMode = !sitePlanManager.editMode;
    const editBtn = document.getElementById('editModeBtn');
    const saveBtn = document.getElementById('savePositionsBtn');
    const doorSizeGroup = document.getElementById('doorSizeGroup');
    
    if (sitePlanManager.editMode) {
        editBtn.innerHTML = '<i class="fas fa-check"></i> Exit Edit';
        editBtn.classList.add('btn-primary');
        saveBtn.style.display = 'inline-flex';
        doorSizeGroup.style.display = 'flex';
        sitePlanManager.canvas.style.cursor = 'crosshair';
    } else {
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit Mode';
        editBtn.classList.remove('btn-primary');
        saveBtn.style.display = 'none';
        doorSizeGroup.style.display = 'none';
        sitePlanManager.canvas.style.cursor = 'grab';
    }
}

function saveDoorPositions() {
    sitePlanManager.saveDoorPositions();
}

function changeDoorSize(size) {
    sitePlanManager.doorIconSize = parseInt(size);
    document.getElementById('doorSizeValue').textContent = size + 'px';
    sitePlanManager.drawSitePlan();
}


// Zoom functions removed - using mouse wheel and pinch gestures only

function closeDoorDetails() {
    document.getElementById('doorDetailsPanel').style.display = 'none';
}



// Initialize the application
// Handle responsive navigation
function handleResponsiveNav() {
    const navMenu = document.getElementById('navMenu');
    const navToggle = document.querySelector('.nav-toggle');
    
    if (window.innerWidth > 768) {
        // Desktop - show menu, hide toggle
        navMenu.style.display = 'flex';
        if (navToggle) navToggle.style.display = 'none';
    } else {
        // Mobile - hide menu, show toggle
        navMenu.style.display = 'none';
        if (navToggle) navToggle.style.display = 'block';
    }
}

// Initialize the application
// Check if Font Awesome is loaded
function checkFontAwesome() {
    // Create a test element
    const testElement = document.createElement('i');
    testElement.className = 'fas fa-check';
    testElement.style.position = 'absolute';
    testElement.style.visibility = 'hidden';
    document.body.appendChild(testElement);
    
    // Check if Font Awesome loaded by checking the font-family
    const computedStyle = window.getComputedStyle(testElement, ':before');
    const fontFamily = computedStyle.fontFamily || computedStyle.getPropertyValue('font-family');
    const fontAwesomeLoaded = fontFamily && fontFamily.includes('Font Awesome');
    
    // Clean up
    document.body.removeChild(testElement);
    
    // If Font Awesome didn't load, add fallback class to body
    if (!fontAwesomeLoaded) {
        document.body.classList.add('fa-failed');
    }
    
    return fontAwesomeLoaded;
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupEventListeners();
    
    // Ensure login form is properly initialized
    setTimeout(() => {
        const emailField = document.getElementById('email');
        const loginForm = document.getElementById('loginForm');
        
        if (emailField) {
            console.log('Email field initialized:', emailField);
            // Ensure the field is focusable
            emailField.tabIndex = 1;
        }
        
        if (loginForm) {
            console.log('Login form initialized:', loginForm);
        }
    }, 100);
    
    // Start periodic door status updates
    startDoorStatusUpdates();
    // Start keep-alive mechanism
    startKeepAlive();
    // Start token manager for automatic refresh
    if (window.tokenManager) {
        window.tokenManager.start();
    }
    // Initialize site plan
    sitePlanManager.init();
    
    // Set up responsive navigation
    handleResponsiveNav();
    window.addEventListener('resize', handleResponsiveNav);
    
    // Check Font Awesome after a short delay
    setTimeout(checkFontAwesome, 500);
});

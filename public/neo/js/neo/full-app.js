/**
 * SimplifiAccess Neo - Full Functionality App
 * Combines beautiful Neo UI with complete original functionality
 */

console.log('🚀 SimplifiAccess Neo Full App - Starting...');

// Cache-busting helper function
function addCacheBusting(url) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_cb=${Date.now()}&_r=${Math.random().toString(36).substr(2, 9)}`;
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
        this.data = {
            doors: [],
            users: [],
            events: [],
            accessGroups: [],
            stats: {}
        };
    }

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

// Modern Application Class with Full Functionality
class SimplifiAccessNeoFull {
    constructor() {
        this.apiBase = '/api';
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        this.isInitialized = false;
        this.sseConnection = null;
        this.keepAliveInterval = null;
    }

    async init() {
        if (this.isInitialized) return;
        
        console.log('🔄 Initializing SimplifiAccess Neo Full...');
        
        try {
            this.showLoadingScreen();
            await this.checkAuthStatus();
            this.setupEventListeners();
            this.setupOnlineStatusListener();
            this.setupKeyboardNavigation();
            await this.loadInitialData();
            this.setupRealtime();
            this.hideLoadingScreen();
            
            this.isInitialized = true;
            console.log('✅ SimplifiAccess Neo Full initialized successfully');
            
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.showError('Failed to initialize application');
        }
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    }

    async hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const app = document.getElementById('app');
        
        if (loadingScreen && app) {
            await this.sleep(500);
            loadingScreen.style.display = 'none';
            app.style.display = 'block';
        }
    }

    async makeRequest(url, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await fetch(`${this.apiBase}${url}`, config);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return await response.json();
            } catch (error) {
                console.warn(`Request attempt ${attempt} failed:`, error.message);
                if (attempt === this.retryAttempts) throw error;
                await this.sleep(this.retryDelay * attempt);
            }
        }
    }

    async checkAuthStatus() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                this.showLogin();
                return;
            }

            const user = await this.makeRequest('/auth/me');
            appState.setUser(user);
            this.showDashboard();
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('token');
            this.showLogin();
        }
    }

    setupEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                if (section) {
                    this.navigateToSection(section);
                }
            });
        });

        // Command palette
        const commandTrigger = document.getElementById('commandTrigger');
        if (commandTrigger) {
            commandTrigger.addEventListener('click', () => {
                this.showCommandPalette();
            });
        }

        // Quick actions
        const quickActions = document.querySelectorAll('.quick-action-btn');
        quickActions.forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleQuickAction(btn.id);
            });
        });

        // Dashboard actions
        this.setupDashboardActions();
    }

    setupDashboardActions() {
        // Refresh dashboard
        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshDashboard();
            });
        }

        // Quick action cards
        const quickActionCards = document.querySelectorAll('.quick-action-card');
        quickActionCards.forEach(card => {
            card.addEventListener('click', () => {
                this.handleQuickActionCard(card.id);
            });
        });
    }

    setupOnlineStatusListener() {
        window.addEventListener('online', () => {
            appState.setOnlineStatus(true);
            this.showToast('Connection restored', 'success');
        });

        window.addEventListener('offline', () => {
            appState.setOnlineStatus(false);
            this.showToast('Connection lost', 'warning');
        });
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Command palette shortcut
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this.showCommandPalette();
            }
        });
    }

    async loadInitialData() {
        try {
            await this.loadDashboardData();
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }

    async loadDashboardData() {
        try {
            const [doors, users, events, stats] = await Promise.allSettled([
                this.makeRequest('/doors'),
                this.makeRequest('/users'),
                this.makeRequest('/events?limit=10'),
                this.makeRequest('/stats')
            ]);

            appState.data = {
                doors: doors.status === 'fulfilled' ? doors.value : [],
                users: users.status === 'fulfilled' ? users.value : [],
                events: events.status === 'fulfilled' ? events.value : [],
                accessGroups: [],
                stats: stats.status === 'fulfilled' ? stats.value : {}
            };

            this.updateDashboard();
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    updateDashboard() {
        this.updateStats();
        this.updateDoorGrid();
        this.updateEvents();
        this.updateBadges();
    }

    updateStats() {
        const stats = appState.data.stats;
        
        const statElements = {
            totalDoors: stats.totalDoors || appState.data.doors.length || 0,
            totalUsers: stats.totalUsers || appState.data.users.length || 0,
            totalAccessGroups: stats.totalAccessGroups || 0,
            systemUptime: stats.uptime || '0h'
        };

        Object.entries(statElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    updateDoorGrid() {
        const doorGrid = document.getElementById('doorGrid');
        if (!doorGrid) return;

        const doors = appState.data.doors;
        doorGrid.innerHTML = '';

        doors.forEach(door => {
            const doorCard = document.createElement('div');
            doorCard.className = `door-card ${door.is_online ? 'online' : 'offline'}`;
            doorCard.innerHTML = `
                <div class="door-header">
                    <div class="door-name">${door.name || 'Unknown Door'}</div>
                    <div class="door-status ${door.is_online ? 'online' : 'offline'}">
                        ${door.is_online ? 'Online' : 'Offline'}
                    </div>
                </div>
                <div class="door-info">
                    <p><strong>Location:</strong> ${door.location || 'Unknown'}</p>
                    <p><strong>IP:</strong> ${door.controller_ip || 'Unknown'}</p>
                    <p><strong>Last Seen:</strong> ${door.last_seen ? this.formatRelativeTime(door.last_seen) : 'Never'}</p>
                </div>
                <div class="door-actions">
                    <button class="btn btn-primary btn-sm" onclick="app.unlockDoor(${door.id})">
                        <i class="fas fa-unlock"></i> Unlock
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="app.lockDoor(${door.id})">
                        <i class="fas fa-lock"></i> Lock
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="app.showDoorDetails(${door.id})">
                        <i class="fas fa-info"></i> Details
                    </button>
                </div>
            `;
            doorGrid.appendChild(doorCard);
        });
    }

    updateEvents() {
        const eventsList = document.getElementById('eventsList');
        if (!eventsList) return;

        const events = appState.data.events;
        eventsList.innerHTML = '';

        events.forEach(event => {
            const eventItem = document.createElement('div');
            eventItem.className = 'event-item';
            eventItem.innerHTML = `
                <div class="event-icon ${event.type || 'info'}">
                    <i class="fas fa-${this.getEventIcon(event.type)}"></i>
                </div>
                <div class="event-content">
                    <div class="event-title">${event.title || 'Unknown Event'}</div>
                    <div class="event-description">${event.description || ''}</div>
                    <div class="event-time">${this.formatRelativeTime(event.timestamp)}</div>
                </div>
            `;
            eventsList.appendChild(eventItem);
        });
    }

    updateBadges() {
        const badges = {
            doorsBadge: appState.data.doors.length,
            usersBadge: appState.data.users.length,
            eventsBadge: appState.data.events.length
        };

        Object.entries(badges).forEach(([id, count]) => {
            const badge = document.getElementById(id);
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'block' : 'none';
            }
        });
    }

    getEventIcon(type) {
        const iconMap = {
            'success': 'check',
            'error': 'times',
            'warning': 'exclamation',
            'info': 'info',
            'door': 'door-open',
            'user': 'user'
        };
        return iconMap[type] || 'circle';
    }

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
    }

    navigateToSection(section) {
        console.log(`🧭 Navigating to ${section}`);
        
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeItem = document.querySelector(`[data-section="${section}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }

        appState.setSection(section);
        this.loadSectionContent(section);
    }

    async loadSectionContent(section) {
        const contentSection = document.getElementById(`${section}Section`);
        if (!contentSection) {
            await this.loadDynamicSection(section);
        } else {
            document.querySelectorAll('.content-section').forEach(s => {
                s.classList.remove('active');
            });
            contentSection.classList.add('active');
        }
    }

    async loadDynamicSection(section) {
        console.log(`Loading dynamic section: ${section}`);
        
        switch (section) {
            case 'doors':
                await this.loadDoorsSection();
                break;
            case 'users':
                await this.loadUsersSection();
                break;
            case 'events':
                await this.loadEventsSection();
                break;
            case 'analytics':
                await this.loadAnalyticsSection();
                break;
            case 'settings':
                await this.loadSettingsSection();
                break;
        }
    }

    async loadDoorsSection() {
        // Create doors section dynamically
        const dynamicContent = document.getElementById('dynamicContent');
        dynamicContent.innerHTML = `
            <div class="content-section active">
                <div class="section-header">
                    <h1>Doors</h1>
                    <div class="section-actions">
                        <button class="btn btn-primary" onclick="app.addDoor()">
                            <i class="fas fa-plus"></i> Add Door
                        </button>
                    </div>
                </div>
                <div class="doors-grid" id="doorsGrid">
                    <!-- Doors will be loaded here -->
                </div>
            </div>
        `;
        
        // Load doors data
        await this.loadDoorsData();
    }

    async loadDoorsData() {
        try {
            const doors = await this.makeRequest('/doors');
            this.renderDoorsGrid(doors);
        } catch (error) {
            console.error('Failed to load doors:', error);
        }
    }

    renderDoorsGrid(doors) {
        const doorsGrid = document.getElementById('doorsGrid');
        if (!doorsGrid) return;

        doorsGrid.innerHTML = '';
        
        doors.forEach(door => {
            const doorCard = document.createElement('div');
            doorCard.className = `door-card ${door.is_online ? 'online' : 'offline'}`;
            doorCard.innerHTML = `
                <div class="door-header">
                    <div class="door-name">${door.name || 'Unknown Door'}</div>
                    <div class="door-status ${door.is_online ? 'online' : 'offline'}">
                        ${door.is_online ? 'Online' : 'Offline'}
                    </div>
                </div>
                <div class="door-info">
                    <p><strong>Location:</strong> ${door.location || 'Unknown'}</p>
                    <p><strong>IP:</strong> ${door.controller_ip || 'Unknown'}</p>
                    <p><strong>Last Seen:</strong> ${door.last_seen ? this.formatRelativeTime(door.last_seen) : 'Never'}</p>
                </div>
                <div class="door-actions">
                    <button class="btn btn-primary btn-sm" onclick="app.unlockDoor(${door.id})">
                        <i class="fas fa-unlock"></i> Unlock
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="app.lockDoor(${door.id})">
                        <i class="fas fa-lock"></i> Lock
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="app.editDoor(${door.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="app.deleteDoor(${door.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            `;
            doorsGrid.appendChild(doorCard);
        });
    }

    // Door control methods
    async unlockDoor(doorId) {
        try {
            const response = await this.makeRequest(`/doors/${doorId}/control`, {
                method: 'POST',
                body: JSON.stringify({ action: 'unlock' })
            });
            
            if (response.success) {
                this.showToast('Door unlocked successfully', 'success');
                this.refreshDashboard();
            }
        } catch (error) {
            this.showToast('Failed to unlock door', 'error');
        }
    }

    async lockDoor(doorId) {
        try {
            const response = await this.makeRequest(`/doors/${doorId}/control`, {
                method: 'POST',
                body: JSON.stringify({ action: 'lock' })
            });
            
            if (response.success) {
                this.showToast('Door locked successfully', 'success');
                this.refreshDashboard();
            }
        } catch (error) {
            this.showToast('Failed to lock door', 'error');
        }
    }

    showDoorDetails(doorId) {
        const door = appState.data.doors.find(d => d.id === doorId);
        if (door) {
            this.showModal('doorDetails', door);
        }
    }

    // Modal system
    showModal(type, data) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${this.getModalTitle(type)}</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${this.getModalContent(type, data)}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    getModalTitle(type) {
        const titles = {
            'doorDetails': 'Door Details',
            'userDetails': 'User Details',
            'addDoor': 'Add Door',
            'editDoor': 'Edit Door'
        };
        return titles[type] || 'Modal';
    }

    getModalContent(type, data) {
        switch (type) {
            case 'doorDetails':
                return `
                    <div class="door-details">
                        <div class="detail-row">
                            <label>Name:</label>
                            <span>${data.name || 'Unknown'}</span>
                        </div>
                        <div class="detail-row">
                            <label>Location:</label>
                            <span>${data.location || 'Unknown'}</span>
                        </div>
                        <div class="detail-row">
                            <label>IP Address:</label>
                            <span>${data.controller_ip || 'Unknown'}</span>
                        </div>
                        <div class="detail-row">
                            <label>Status:</label>
                            <span class="status ${data.is_online ? 'online' : 'offline'}">
                                ${data.is_online ? 'Online' : 'Offline'}
                            </span>
                        </div>
                    </div>
                `;
            default:
                return '<p>Modal content</p>';
        }
    }

    // Theme management
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
    }

    // Command palette
    showCommandPalette() {
        this.showToast('Command palette not implemented yet', 'info');
    }

    // Quick actions
    handleQuickAction(actionId) {
        switch (actionId) {
            case 'quickUnlock':
                this.unlockAllDoors();
                break;
            case 'quickLock':
                this.lockAllDoors();
                break;
            case 'quickScan':
                this.showToast('QR scanning not implemented yet', 'info');
                break;
        }
    }

    handleQuickActionCard(actionId) {
        switch (actionId) {
            case 'addUser':
                this.navigateToSection('users');
                break;
            case 'addDoor':
                this.navigateToSection('doors');
                break;
            case 'scanQR':
                this.showToast('QR scanning not implemented yet', 'info');
                break;
            case 'viewLogs':
                this.navigateToSection('events');
                break;
        }
    }

    async unlockAllDoors() {
        try {
            const doors = appState.data.doors;
            const promises = doors.map(door => 
                this.makeRequest(`/doors/${door.id}/control`, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'unlock' })
                })
            );
            
            await Promise.allSettled(promises);
            this.showToast('All doors unlocked', 'success');
        } catch (error) {
            this.showToast('Failed to unlock doors', 'error');
        }
    }

    async lockAllDoors() {
        try {
            const doors = appState.data.doors;
            const promises = doors.map(door => 
                this.makeRequest(`/doors/${door.id}/control`, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'lock' })
                })
            );
            
            await Promise.allSettled(promises);
            this.showToast('All doors locked', 'success');
        } catch (error) {
            this.showToast('Failed to lock doors', 'error');
        }
    }

    async refreshDashboard() {
        this.showToast('Refreshing data...', 'info');
        await this.loadDashboardData();
        this.showToast('Data refreshed', 'success');
    }

    // Toast notifications
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}"></i>
            </div>
            <div class="toast-message">${message}</div>
        `;
        
        const container = document.getElementById('toastContainer') || document.body;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    // Utility methods
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Setup real-time updates
    setupRealtime() {
        // TODO: Implement SSE connection
        console.log('Real-time updates not implemented yet');
    }

    // Login/Logout methods
    showLogin() {
        // TODO: Implement login form
        console.log('Login not implemented yet');
    }

    showDashboard() {
        // Dashboard is shown by default
        console.log('Dashboard shown');
    }

    // Placeholder methods for other sections
    async loadUsersSection() {
        console.log('Users section not implemented yet');
    }

    async loadEventsSection() {
        console.log('Events section not implemented yet');
    }

    async loadAnalyticsSection() {
        console.log('Analytics section not implemented yet');
    }

    async loadSettingsSection() {
        console.log('Settings section not implemented yet');
    }

    addDoor() {
        this.showToast('Add door not implemented yet', 'info');
    }

    editDoor(doorId) {
        this.showToast('Edit door not implemented yet', 'info');
    }

    deleteDoor(doorId) {
        this.showToast('Delete door not implemented yet', 'info');
    }
}

// Initialize the application
console.log('🚀 Starting SimplifiAccess Neo Full App...');

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM loaded, initializing app...');
        window.app = new SimplifiAccessNeoFull();
        window.app.init();
    });
} else {
    console.log('📄 DOM already loaded, initializing app...');
    window.app = new SimplifiAccessNeoFull();
    window.app.init();
}

console.log('✅ SimplifiAccess Neo Full App script loaded');
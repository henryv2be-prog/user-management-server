/**
 * SimplifiAccess Neo - Debug Version
 * Simplified version to fix black screen issues
 */

console.log('🚀 SimplifiAccess Neo Debug - Starting...');

// Simple state management
const AppState = {
    user: null,
    theme: 'dark',
    currentSection: 'dashboard',
    loading: true,
    data: {
        doors: [],
        users: [],
        events: [],
        stats: {}
    }
};

// Simple API client
const API = {
    baseURL: '/api',
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },

    async getDoors() {
        try {
            return await this.request('/doors');
        } catch (error) {
            console.error('Failed to fetch doors:', error);
            return [];
        }
    },

    async getUsers() {
        try {
            return await this.request('/users');
        } catch (error) {
            console.error('Failed to fetch users:', error);
            return [];
        }
    },

    async getEvents() {
        try {
            return await this.request('/events?limit=10');
        } catch (error) {
            console.error('Failed to fetch events:', error);
            return [];
        }
    },

    async getStats() {
        try {
            return await this.request('/stats');
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            return {};
        }
    }
};

// Simple utility functions
const Utils = {
    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

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
};

// Main application class
class SimplifiAccessNeo {
    constructor() {
        this.isInitialized = false;
        console.log('📱 SimplifiAccess Neo - Constructor called');
    }

    async init() {
        if (this.isInitialized) return;
        
        console.log('🔄 Initializing SimplifiAccess Neo...');
        
        try {
            // Show loading screen
            this.showLoadingScreen();
            
            // Wait a bit for DOM to be ready
            await this.sleep(1000);
            
            // Initialize UI
            this.initializeUI();
            
            // Load data
            await this.loadData();
            
            // Hide loading screen
            this.hideLoadingScreen();
            
            this.isInitialized = true;
            console.log('✅ SimplifiAccess Neo initialized successfully');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
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

    initializeUI() {
        console.log('🎨 Initializing UI...');
        
        // Set up theme
        this.setTheme(AppState.theme);
        
        // Set up navigation
        this.setupNavigation();
        
        // Set up quick actions
        this.setupQuickActions();
        
        console.log('✅ UI initialized');
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        AppState.theme = theme;
        
        // Update theme toggle icon
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
    }

    setupNavigation() {
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const newTheme = AppState.theme === 'dark' ? 'light' : 'dark';
                this.setTheme(newTheme);
            });
        }

        // Navigation items
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
    }

    setupQuickActions() {
        const quickActions = document.querySelectorAll('.quick-action-btn');
        quickActions.forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleQuickAction(btn.id);
            });
        });
    }

    async loadData() {
        console.log('📊 Loading data...');
        
        try {
            const [doors, users, events, stats] = await Promise.allSettled([
                API.getDoors(),
                API.getUsers(),
                API.getEvents(),
                API.getStats()
            ]);

            AppState.data = {
                doors: doors.status === 'fulfilled' ? doors.value : [],
                users: users.status === 'fulfilled' ? users.value : [],
                events: events.status === 'fulfilled' ? events.value : [],
                stats: stats.status === 'fulfilled' ? stats.value : {}
            };

            this.updateDashboard();
            console.log('✅ Data loaded successfully');
            
        } catch (error) {
            console.error('❌ Failed to load data:', error);
            Utils.showToast('Failed to load data', 'error');
        }
    }

    updateDashboard() {
        console.log('🔄 Updating dashboard...');
        
        // Update stats
        this.updateStats();
        
        // Update door grid
        this.updateDoorGrid();
        
        // Update events
        this.updateEvents();
        
        // Update navigation badges
        this.updateBadges();
        
        console.log('✅ Dashboard updated');
    }

    updateStats() {
        const stats = AppState.data.stats;
        
        const statElements = {
            totalDoors: stats.totalDoors || AppState.data.doors.length || 0,
            totalUsers: stats.totalUsers || AppState.data.users.length || 0,
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

        const doors = AppState.data.doors;
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
                    <p><strong>Last Seen:</strong> ${door.last_seen ? Utils.formatRelativeTime(door.last_seen) : 'Never'}</p>
                </div>
                <div class="door-actions">
                    <button class="btn btn-primary btn-sm" onclick="app.unlockDoor(${door.id})">
                        <i class="fas fa-unlock"></i> Unlock
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="app.lockDoor(${door.id})">
                        <i class="fas fa-lock"></i> Lock
                    </button>
                </div>
            `;
            doorGrid.appendChild(doorCard);
        });
    }

    updateEvents() {
        const eventsList = document.getElementById('eventsList');
        if (!eventsList) return;

        const events = AppState.data.events;
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
                    <div class="event-time">${Utils.formatRelativeTime(event.timestamp)}</div>
                </div>
            `;
            eventsList.appendChild(eventItem);
        });
    }

    updateBadges() {
        const badges = {
            doorsBadge: AppState.data.doors.length,
            usersBadge: AppState.data.users.length,
            eventsBadge: AppState.data.events.length
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

        AppState.currentSection = section;
        Utils.showToast(`Switched to ${section}`, 'info');
    }

    showCommandPalette() {
        Utils.showToast('Command palette not implemented yet', 'info');
    }

    handleQuickAction(actionId) {
        console.log(`⚡ Quick action: ${actionId}`);
        
        switch (actionId) {
            case 'quickUnlock':
                Utils.showToast('Unlocking all doors...', 'info');
                break;
            case 'quickLock':
                Utils.showToast('Locking all doors...', 'info');
                break;
            case 'quickScan':
                Utils.showToast('QR scanning not implemented yet', 'info');
                break;
        }
    }

    async unlockDoor(doorId) {
        Utils.showToast(`Unlocking door ${doorId}...`, 'info');
        // TODO: Implement actual unlock
    }

    async lockDoor(doorId) {
        Utils.showToast(`Locking door ${doorId}...`, 'info');
        // TODO: Implement actual lock
    }

    showError(message) {
        console.error('🚨 Error:', message);
        Utils.showToast(message, 'error');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the application
console.log('🚀 Starting SimplifiAccess Neo...');

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM loaded, initializing app...');
        window.app = new SimplifiAccessNeo();
        window.app.init();
    });
} else {
    console.log('📄 DOM already loaded, initializing app...');
    window.app = new SimplifiAccessNeo();
    window.app.init();
}

console.log('✅ SimplifiAccess Neo script loaded');
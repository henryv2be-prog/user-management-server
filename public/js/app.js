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

        // Add auth token if available
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
                
                if (attempt === this.retryAttempts) {
                    throw error;
                }
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
            }
        }
    }

    // Check authentication status
    async checkAuthStatus() {
        const token = localStorage.getItem('token');
        if (!token) {
            this.showLogin();
            return;
        }

        try {
            const user = await this.makeRequest('/auth/me');
            appState.setUser(user);
            this.showDashboard();
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('token');
            this.showLogin();
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', this.handleRegister.bind(this));
        }

        // Navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('[onclick*="showSection"]')) {
                e.preventDefault();
                const section = e.target.getAttribute('onclick').match(/showSection\('([^']+)'\)/)[1];
                this.showSection(section);
            }
        });

        // Modal close buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('close') || e.target.classList.contains('modal')) {
                this.closeModal();
            }
        });

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    // Setup online status listener
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

    // Setup keyboard navigation
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Alt + number keys for quick navigation
            if (e.altKey && e.key >= '1' && e.key <= '9') {
                e.preventDefault();
                const sections = ['dashboard', 'events', 'users', 'doors', 'accessGroups', 'doorControllerDiscovery', 'settings', 'profile'];
                const index = parseInt(e.key) - 1;
                if (sections[index]) {
                    this.showSection(sections[index]);
                }
            }
        });
    }

    // Handle login
    async handleLogin(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const credentials = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        try {
            this.showLoading(true);
            const response = await this.makeRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });

            localStorage.setItem('token', response.token);
            appState.setUser(response.user);
            this.showDashboard();
            this.showToast('Login successful', 'success');
        } catch (error) {
            console.error('Login failed:', error);
            this.showError('Login failed: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    // Handle register
    async handleRegister(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const userData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            password: formData.get('password')
        };

        try {
            this.showLoading(true);
            const response = await this.makeRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            this.showToast('Registration successful! Please login.', 'success');
            this.showLogin();
        } catch (error) {
            console.error('Registration failed:', error);
            this.showError('Registration failed: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    // Show sections
    showSection(section) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(el => {
            el.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(`${section}Section`);
        if (targetSection) {
            targetSection.classList.add('active');
            appState.setSection(section);
        }

        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        const activeLink = document.querySelector(`[onclick*="showSection('${section}')"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Load section data
        this.loadSectionData(section);
    }

    // Load section data
    async loadSectionData(section) {
        try {
            switch (section) {
                case 'dashboard':
                    await this.loadDashboard();
                    break;
                case 'events':
                    await this.loadEvents();
                    break;
                case 'users':
                    await this.loadUsers();
                    break;
                case 'doors':
                    await this.loadDoors();
                    break;
                case 'accessGroups':
                    await this.loadAccessGroups();
                    break;
                case 'doorControllerDiscovery':
                    await this.loadDoorControllerDiscovery();
                    break;
                case 'settings':
                    await this.loadSettings();
                    break;
                case 'profile':
                    await this.loadProfile();
                    break;
            }
        } catch (error) {
            console.error(`Failed to load ${section} data:`, error);
            this.showError(`Failed to load ${section} data`);
        }
    }

    // Show login
    showLogin() {
        document.getElementById('loginSection').classList.add('active');
        document.getElementById('mainNavbar').style.display = 'none';
    }

    // Show dashboard
    showDashboard() {
        document.getElementById('loginSection').classList.remove('active');
        document.getElementById('mainNavbar').style.display = 'block';
        this.showSection('dashboard');
    }

    // Show loading
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    // Show error
    showError(message) {
        this.showToast(message, 'error');
    }

    // Show toast notification
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }

    // Close modal
    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    // Load dashboard data
    async loadDashboard() {
        try {
            const [doors, events] = await Promise.all([
                this.makeRequest('/doors'),
                this.makeRequest('/events?limit=10')
            ]);

            this.renderDoorStatus(doors);
            this.renderRecentEvents(events);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        }
    }

    // Render door status
    renderDoorStatus(doors) {
        const container = document.getElementById('doorGrid');
        if (!container) return;

        container.innerHTML = doors.map(door => `
            <div class="door-card ${door.is_online ? 'online' : 'offline'}">
                <div class="door-header">
                    <h3>${door.name}</h3>
                    <span class="door-status ${door.is_online ? 'online' : 'offline'}">
                        ${door.is_online ? 'Online' : 'Offline'}
                    </span>
                </div>
                <div class="door-info">
                    <p><strong>Location:</strong> ${door.location}</p>
                    <p><strong>IP:</strong> ${door.controller_ip}</p>
                    <p><strong>Last Seen:</strong> ${new Date(door.last_seen).toLocaleString()}</p>
                </div>
                <div class="door-actions">
                    <button class="btn btn-sm btn-primary" onclick="controlDoor(${door.id}, 'unlock')">
                        <i class="fas fa-unlock"></i> Unlock
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="controlDoor(${door.id}, 'lock')">
                        <i class="fas fa-lock"></i> Lock
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Render recent events
    renderRecentEvents(events) {
        // Implementation for recent events
        console.log('Recent events:', events);
    }

    // Load other sections (placeholder implementations)
    async loadEvents() {
        console.log('Loading events...');
    }

    async loadUsers() {
        console.log('Loading users...');
    }

    async loadDoors() {
        console.log('Loading doors...');
    }

    async loadAccessGroups() {
        console.log('Loading access groups...');
    }

    async loadDoorControllerDiscovery() {
        console.log('Loading door controller discovery...');
    }

    async loadSettings() {
        console.log('Loading settings...');
    }

    async loadProfile() {
        console.log('Loading profile...');
    }
}

// Global functions for backward compatibility
function showSection(section) {
    app.showSection(section);
}

function showLogin() {
    app.showLogin();
}

function logout() {
    localStorage.removeItem('token');
    appState.setUser(null);
    app.showLogin();
    app.showToast('Logged out successfully', 'info');
}

function toggleNav() {
    const navMenu = document.getElementById('navMenu');
    if (navMenu) {
        navMenu.classList.toggle('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new SimplifiAccessApp();
    app.init();
});
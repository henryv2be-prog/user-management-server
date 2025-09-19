/**
 * SimplifiAccess Neo - Main Application
 * Modern, component-based access control system
 */

class SimplifiAccessNeo {
    constructor() {
        this.components = new Map();
        this.modals = new Map();
        this.toasts = [];
        this.isInitialized = false;
        this.loadingScreen = null;
        this.app = null;
    }

    async init() {
        if (this.isInitialized) return;

        performanceMonitor.startTiming('appInit');
        
        try {
            // Show loading screen
            this.showLoadingScreen();
            
            // Initialize core systems
            await this.initializeCore();
            
            // Initialize UI components
            await this.initializeUI();
            
            // Load initial data
            await this.loadInitialData();
            
            // Set up real-time connections
            this.setupRealtime();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Hide loading screen
            await this.hideLoadingScreen();
            
            this.isInitialized = true;
            console.log('✅ SimplifiAccess Neo initialized successfully');
            
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            errorHandler.handle(error, { context: 'appInit' });
            this.showError('Failed to initialize application');
        } finally {
            performanceMonitor.endTiming('appInit');
        }
    }

    async initializeCore() {
        // Set up global error handling
        window.addEventListener('unhandledrejection', (event) => {
            errorHandler.handle(event.reason, { context: 'unhandledRejection' });
        });

        // Set up online/offline detection
        window.addEventListener('online', () => {
            neoState.setState({ online: true });
            eventBus.emit('toast', { type: 'success', message: 'Connection restored' });
        });

        window.addEventListener('offline', () => {
            neoState.setState({ online: false });
            eventBus.emit('toast', { type: 'warning', message: 'Connection lost' });
        });

        // Set up theme persistence
        const savedTheme = StorageUtils.get('theme') || 'dark';
        this.setTheme(savedTheme);

        // Set up state persistence
        this.setupStatePersistence();
    }

    async initializeUI() {
        this.app = document.getElementById('app');
        this.loadingScreen = document.getElementById('loadingScreen');

        // Initialize main components
        this.initializeNavigation();
        this.initializeSidebar();
        this.initializeCommandPalette();
        this.initializeNotifications();
        this.initializeModals();
        this.initializeToasts();
    }

    initializeNavigation() {
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = neoState.getState().theme;
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                this.setTheme(newTheme);
            });
        }

        // Command palette trigger
        const commandTrigger = document.getElementById('commandTrigger');
        if (commandTrigger) {
            commandTrigger.addEventListener('click', () => {
                this.showCommandPalette();
            });
        }

        // Notifications toggle
        const notificationBtn = document.getElementById('notificationBtn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => {
                this.toggleNotifications();
            });
        }

        // User menu
        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar) {
            userAvatar.addEventListener('click', () => {
                this.showUserMenu();
            });
        }
    }

    initializeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const navToggle = document.getElementById('navToggle');
        const navItems = document.querySelectorAll('.nav-item');

        // Toggle sidebar
        if (navToggle) {
            navToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        // Navigation items
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                if (section) {
                    this.navigateToSection(section);
                }
            });
        });

        // Quick actions
        const quickActions = document.querySelectorAll('.quick-action-btn');
        quickActions.forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleQuickAction(btn.id);
            });
        });
    }

    initializeCommandPalette() {
        const commandPalette = document.getElementById('commandPalette');
        const commandInput = document.getElementById('commandInput');
        const commandResults = document.getElementById('commandResults');

        if (!commandPalette || !commandInput || !commandResults) return;

        // Command palette commands
        this.commands = [
            {
                id: 'navigate-dashboard',
                title: 'Go to Dashboard',
                description: 'Navigate to the main dashboard',
                icon: 'fas fa-tachometer-alt',
                action: () => this.navigateToSection('dashboard')
            },
            {
                id: 'navigate-doors',
                title: 'Go to Doors',
                description: 'View and manage doors',
                icon: 'fas fa-door-open',
                action: () => this.navigateToSection('doors')
            },
            {
                id: 'navigate-users',
                title: 'Go to Users',
                description: 'View and manage users',
                icon: 'fas fa-users',
                action: () => this.navigateToSection('users')
            },
            {
                id: 'navigate-events',
                title: 'Go to Events',
                description: 'View system events',
                icon: 'fas fa-history',
                action: () => this.navigateToSection('events')
            },
            {
                id: 'toggle-theme',
                title: 'Toggle Theme',
                description: 'Switch between light and dark theme',
                icon: 'fas fa-moon',
                action: () => this.toggleTheme()
            },
            {
                id: 'refresh-data',
                title: 'Refresh Data',
                description: 'Reload all data from server',
                icon: 'fas fa-sync-alt',
                action: () => this.refreshAllData()
            }
        ];

        // Search functionality
        commandInput.addEventListener('input', Utils.debounce((e) => {
            this.searchCommands(e.target.value);
        }, 200));

        // Keyboard navigation
        commandInput.addEventListener('keydown', (e) => {
            this.handleCommandPaletteKeydown(e);
        });

        // Close on backdrop click
        commandPalette.addEventListener('click', (e) => {
            if (e.target === commandPalette) {
                this.hideCommandPalette();
            }
        });
    }

    initializeNotifications() {
        const notificationsPanel = document.getElementById('notificationsPanel');
        const notificationsList = document.getElementById('notificationsList');
        const clearNotifications = document.getElementById('clearNotifications');

        if (clearNotifications) {
            clearNotifications.addEventListener('click', () => {
                this.clearNotifications();
            });
        }

        // Listen for new notifications
        eventBus.on('notification', (notification) => {
            this.addNotification(notification);
        });
    }

    initializeModals() {
        // Create modal container if it doesn't exist
        if (!document.getElementById('modalContainer')) {
            const modalContainer = document.createElement('div');
            modalContainer.id = 'modalContainer';
            modalContainer.className = 'modal-container';
            document.body.appendChild(modalContainer);
        }
    }

    initializeToasts() {
        // Create toast container if it doesn't exist
        if (!document.getElementById('toastContainer')) {
            const toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        // Listen for toast events
        eventBus.on('toast', (toast) => {
            this.showToast(toast);
        });
    }

    setupStatePersistence() {
        // Persist theme changes
        neoState.subscribe('stateChange', ({ newState }) => {
            if (newState.theme !== undefined) {
                StorageUtils.set('theme', newState.theme);
            }
        });
    }

    setupRealtime() {
        // Connect to real-time updates
        neoAPI.connectSSE();

        // Listen for real-time events
        eventBus.on('doorStatusUpdate', (data) => {
            this.updateDoorStatus(data);
        });

        eventBus.on('userActivityUpdate', (data) => {
            this.updateUserActivity(data);
        });

        eventBus.on('systemEvent', (data) => {
            this.handleSystemEvent(data);
        });
    }

    setupEventListeners() {
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleGlobalKeydown(e);
        });

        // Window events
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // State change listeners
        neoState.subscribe('stateChange', ({ newState }) => {
            this.handleStateChange(newState);
        });
    }

    async loadInitialData() {
        try {
            // Load user data
            const user = await neoAPI.getCurrentUser();
            if (user) {
                neoState.setState({ user });
            }

            // Load dashboard data
            await this.loadDashboardData();

        } catch (error) {
            console.error('Error loading initial data:', error);
            // Don't throw here, let the app continue
        }
    }

    async loadDashboardData() {
        try {
            const [doors, users, events, stats] = await Promise.allSettled([
                neoAPI.getDoors(),
                neoAPI.getUsers(),
                neoAPI.getEvents({ limit: 10 }),
                neoAPI.getStats()
            ]);

            const data = {
                doors: doors.status === 'fulfilled' ? doors.value : [],
                users: users.status === 'fulfilled' ? users.value : [],
                events: events.status === 'fulfilled' ? events.value : [],
                stats: stats.status === 'fulfilled' ? stats.value : {}
            };

            neoState.setState({ data });

            // Update UI
            this.updateDashboard(data);

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    // UI Methods
    showLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'flex';
        }
    }

    async hideLoadingScreen() {
        if (this.loadingScreen) {
            await AnimationUtils.fadeOut(this.loadingScreen);
            this.loadingScreen.style.display = 'none';
        }
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        neoState.setState({ theme });

        // Update theme toggle icon
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
    }

    toggleTheme() {
        const currentTheme = neoState.getState().theme;
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const app = document.getElementById('app');
        
        if (sidebar && app) {
            sidebar.classList.toggle('active');
            app.classList.toggle('sidebar-collapsed');
        }
    }

    navigateToSection(section) {
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeItem = document.querySelector(`[data-section="${section}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }

        // Update state
        neoState.setState({ currentSection: section });

        // Load section content
        this.loadSectionContent(section);
    }

    async loadSectionContent(section) {
        const contentSection = document.getElementById(`${section}Section`);
        if (!contentSection) {
            // Load dynamic content
            await this.loadDynamicSection(section);
        } else {
            // Show existing section
            document.querySelectorAll('.content-section').forEach(s => {
                s.classList.remove('active');
            });
            contentSection.classList.add('active');
        }
    }

    async loadDynamicSection(section) {
        // This would load section-specific components
        console.log(`Loading dynamic section: ${section}`);
    }

    showCommandPalette() {
        const commandPalette = document.getElementById('commandPalette');
        const commandInput = document.getElementById('commandInput');
        
        if (commandPalette) {
            commandPalette.classList.add('active');
            commandPalette.style.display = 'flex';
            
            if (commandInput) {
                commandInput.focus();
            }
        }
    }

    hideCommandPalette() {
        const commandPalette = document.getElementById('commandPalette');
        if (commandPalette) {
            commandPalette.classList.remove('active');
            commandPalette.style.display = 'none';
        }
    }

    searchCommands(query) {
        const commandResults = document.getElementById('commandResults');
        if (!commandResults) return;

        const filteredCommands = this.commands.filter(cmd => 
            cmd.title.toLowerCase().includes(query.toLowerCase()) ||
            cmd.description.toLowerCase().includes(query.toLowerCase())
        );

        commandResults.innerHTML = filteredCommands.map(cmd => `
            <div class="command-result" data-command="${cmd.id}">
                <i class="${cmd.icon}"></i>
                <div>
                    <div class="command-title">${cmd.title}</div>
                    <div class="command-description">${cmd.description}</div>
                </div>
            </div>
        `).join('');

        // Add click handlers
        commandResults.querySelectorAll('.command-result').forEach(result => {
            result.addEventListener('click', () => {
                const commandId = result.dataset.command;
                const command = this.commands.find(cmd => cmd.id === commandId);
                if (command) {
                    command.action();
                    this.hideCommandPalette();
                }
            });
        });
    }

    handleCommandPaletteKeydown(e) {
        if (e.key === 'Escape') {
            this.hideCommandPalette();
        }
    }

    toggleNotifications() {
        const notificationsPanel = document.getElementById('notificationsPanel');
        if (notificationsPanel) {
            notificationsPanel.classList.toggle('active');
        }
    }

    addNotification(notification) {
        const notificationsList = document.getElementById('notificationsList');
        if (!notificationsList) return;

        const notificationElement = document.createElement('div');
        const notificationComponent = new NotificationComponent(notificationElement, {
            notification: {
                ...notification,
                timestamp: notification.timestamp || new Date().toISOString()
            }
        });

        notificationComponent.mount();
        notificationsList.insertBefore(notificationElement, notificationsList.firstChild);

        // Update badge
        this.updateNotificationBadge();
    }

    clearNotifications() {
        const notificationsList = document.getElementById('notificationsList');
        if (notificationsList) {
            notificationsList.innerHTML = '';
            this.updateNotificationBadge();
        }
    }

    updateNotificationBadge() {
        const badge = document.getElementById('notificationBadge');
        const notificationsList = document.getElementById('notificationsList');
        
        if (badge && notificationsList) {
            const count = notificationsList.children.length;
            badge.textContent = count;
            badge.style.display = count > 0 ? 'block' : 'none';
        }
    }

    showToast(toast) {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toastElement = document.createElement('div');
        const toastComponent = new ToastComponent(toastElement, { toast });
        
        toastComponent.mount();
        toastContainer.appendChild(toastElement);

        // Remove after animation
        setTimeout(() => {
            if (toastElement.parentNode) {
                toastElement.remove();
            }
        }, 6000);
    }

    showModal(type, data) {
        const modalContainer = document.getElementById('modalContainer');
        if (!modalContainer) return;

        const modalElement = document.createElement('div');
        const modalComponent = new ModalComponent(modalElement, { type, data });
        
        modalComponent.mount();
        modalContainer.appendChild(modalElement);
        
        modalComponent.show();
    }

    // Data update methods
    updateDashboard(data) {
        // Update stats cards
        this.updateStatsCards(data.stats);
        
        // Update door grid
        this.updateDoorGrid(data.doors);
        
        // Update events list
        this.updateEventsList(data.events);
        
        // Update navigation badges
        this.updateNavigationBadges(data);
    }

    updateStatsCards(stats) {
        const statCards = [
            { id: 'totalDoors', value: stats.totalDoors || 0 },
            { id: 'totalUsers', value: stats.totalUsers || 0 },
            { id: 'totalAccessGroups', value: stats.totalAccessGroups || 0 },
            { id: 'systemUptime', value: stats.uptime || '0h' }
        ];

        statCards.forEach(stat => {
            const element = document.getElementById(stat.id);
            if (element) {
                element.textContent = stat.value;
            }
        });
    }

    updateDoorGrid(doors) {
        const doorGrid = document.getElementById('doorGrid');
        if (!doorGrid) return;

        doorGrid.innerHTML = '';
        
        doors.forEach(door => {
            const doorElement = document.createElement('div');
            const doorComponent = new DoorCardComponent(doorElement, { door });
            doorComponent.mount();
            doorGrid.appendChild(doorElement);
        });
    }

    updateEventsList(events) {
        const eventsList = document.getElementById('eventsList');
        if (!eventsList) return;

        eventsList.innerHTML = '';
        
        events.forEach(event => {
            const eventElement = document.createElement('div');
            const eventComponent = new EventItemComponent(eventElement, { event });
            eventComponent.mount();
            eventsList.appendChild(eventElement);
        });
    }

    updateNavigationBadges(data) {
        const badges = {
            doorsBadge: data.doors?.length || 0,
            usersBadge: data.users?.length || 0,
            eventsBadge: data.events?.length || 0
        };

        Object.entries(badges).forEach(([id, count]) => {
            const badge = document.getElementById(id);
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'block' : 'none';
            }
        });
    }

    updateDoorStatus(doorData) {
        // Find and update door card
        const doorElement = document.querySelector(`[data-door-id="${doorData.id}"]`);
        if (doorElement) {
            const doorComponent = this.components.get(doorElement);
            if (doorComponent) {
                doorComponent.update({ door: doorData });
            }
        }
    }

    // Event handlers
    handleGlobalKeydown(e) {
        // Command palette shortcut
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            this.showCommandPalette();
        }
    }

    handleStateChange(newState) {
        // Handle theme changes
        if (newState.theme) {
            this.setTheme(newState.theme);
        }
    }

    handleQuickAction(actionId) {
        switch (actionId) {
            case 'quickUnlock':
                this.unlockAllDoors();
                break;
            case 'quickLock':
                this.lockAllDoors();
                break;
            case 'quickScan':
                this.startQRScan();
                break;
        }
    }

    async unlockAllDoors() {
        try {
            const doors = neoState.getState().data.doors;
            const promises = doors.map(door => 
                neoAPI.controlDoor(door.id, 'unlock')
            );
            
            await Promise.allSettled(promises);
            eventBus.emit('toast', { type: 'success', message: 'All doors unlocked' });
        } catch (error) {
            eventBus.emit('toast', { type: 'error', message: 'Failed to unlock doors' });
        }
    }

    async lockAllDoors() {
        try {
            const doors = neoState.getState().data.doors;
            const promises = doors.map(door => 
                neoAPI.controlDoor(door.id, 'lock')
            );
            
            await Promise.allSettled(promises);
            eventBus.emit('toast', { type: 'success', message: 'All doors locked' });
        } catch (error) {
            eventBus.emit('toast', { type: 'error', message: 'Failed to lock doors' });
        }
    }

    startQRScan() {
        // QR code scanning functionality
        eventBus.emit('toast', { type: 'info', message: 'QR scanning not implemented yet' });
    }

    async refreshAllData() {
        eventBus.emit('toast', { type: 'info', message: 'Refreshing data...' });
        await this.loadDashboardData();
        eventBus.emit('toast', { type: 'success', message: 'Data refreshed' });
    }

    showError(message) {
        eventBus.emit('toast', { type: 'error', message });
    }

    // Cleanup
    cleanup() {
        // Disconnect real-time connections
        neoAPI.disconnectSSE();
        
        // Clean up components
        this.components.forEach(component => {
            if (component.cleanup) {
                component.cleanup();
            }
        });
        
        // Clean up performance monitoring
        performanceMonitor.cleanup();
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const app = new SimplifiAccessNeo();
    await app.init();
    
    // Make app globally available for debugging
    window.app = app;
});

// Export for use in other modules
window.SimplifiAccessNeo = SimplifiAccessNeo;
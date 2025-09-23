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
                
                // Exponential backoff
                await new Promise(resolve => 
                    setTimeout(resolve, this.retryDelay * Math.pow(2, attempt - 1))
                );
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

// Check if user is authenticated
async function checkAuthStatus() {
    const token = localStorage.getItem('token');
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
                // Ensure SSE connection is established after auth check
                setTimeout(() => {
                    if (!isEventStreamConnected) {
                        console.log('🔄 Establishing SSE connection after auth check...');
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
}

// Settings Section Functions
let currentTestId = null;
let testStatusInterval = null;

// Load settings page
async function loadSettings() {
    if (!currentUser || !hasRole('admin')) {
        showToast('Access denied. Admin privileges required.', 'error');
        return;
    }
    
    try {
        await Promise.all([
            loadSystemInfo(),
            loadVersionInfo()
        ]);
    } catch (error) {
        console.error('Failed to load settings:', error);
        showToast('Failed to load settings', 'error');
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
        showToast('Commit SHA copied to clipboard!', 'success');
    }).catch(() => {
        showToast('Failed to copy commit SHA', 'error');
    });
}

// Refresh version information
function refreshVersionInfo() {
    loadVersionInfo();
    showToast('Version information refreshed', 'success');
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

// Update test configuration based on selected type
function updateTestConfig() {
    const testType = document.getElementById('testType').value;
    const concurrentUsers = document.getElementById('concurrentUsers');
    const testDuration = document.getElementById('testDuration');
    const requestRate = document.getElementById('requestRate');
    
    switch (testType) {
        case 'quick':
            concurrentUsers.value = 5;
            testDuration.value = 30;
            requestRate.value = 3;
            break;
        case 'standard':
            concurrentUsers.value = 10;
            testDuration.value = 120;
            requestRate.value = 5;
            break;
        case 'extended':
            concurrentUsers.value = 20;
            testDuration.value = 300;
            requestRate.value = 8;
            break;
        case 'custom':
            // Keep current values
            break;
    }
}

// Start stress test
async function startStressTest() {
    if (!currentUser || !hasRole('admin')) {
        showToast('Access denied. Admin privileges required.', 'error');
        return;
    }
    
    const testType = document.getElementById('testType').value;
    const concurrentUsers = parseInt(document.getElementById('concurrentUsers').value);
    const testDuration = parseInt(document.getElementById('testDuration').value);
    const requestRate = parseInt(document.getElementById('requestRate').value);
    
    // Get test options
    const testOptions = {
        testAuth: document.getElementById('testAuth').checked,
        testUsers: document.getElementById('testUsers').checked,
        testDoors: document.getElementById('testDoors').checked,
        testAccessGroups: document.getElementById('testAccessGroups').checked,
        testEvents: document.getElementById('testEvents').checked,
        testDatabase: document.getElementById('testDatabase').checked
    };
    
    // Validate at least one test option is selected
    if (!Object.values(testOptions).some(option => option)) {
        showToast('Please select at least one test option', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch('/api/settings/stress-test/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                testType,
                concurrentUsers,
                testDuration,
                requestRate,
                testOptions
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            currentTestId = data.testId;
            
            // Update UI
            document.getElementById('startTestBtn').disabled = true;
            document.getElementById('stopTestBtn').disabled = false;
            document.getElementById('testProgress').style.display = 'block';
            document.getElementById('testResults').style.display = 'none';
            document.getElementById('testLogs').style.display = 'block';
            
            // Clear previous logs
            document.getElementById('logsContent').innerHTML = '';
            
            // Start polling for test status
            startTestStatusPolling();
            
            showToast('Stress test started successfully', 'success');
        } else {
            const errorData = await response.json();
            showToast(errorData.message || 'Failed to start stress test', 'error');
        }
    } catch (error) {
        console.error('Start stress test error:', error);
        showToast('Failed to start stress test', 'error');
    } finally {
        hideLoading();
    }
}

// Stop stress test
async function stopStressTest() {
    if (!currentTestId) {
        showToast('No active test to stop', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/settings/stress-test/${currentTestId}/stop`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showToast('Stress test stopped', 'info');
            stopTestStatusPolling();
            updateTestUI('stopped');
        } else {
            const errorData = await response.json();
            showToast(errorData.message || 'Failed to stop stress test', 'error');
        }
    } catch (error) {
        console.error('Stop stress test error:', error);
        showToast('Failed to stop stress test', 'error');
    }
}

// Start polling for test status
function startTestStatusPolling() {
    testStatusInterval = setInterval(async () => {
        await updateTestStatus();
    }, 1000); // Poll every second
}

// Stop polling for test status
function stopTestStatusPolling() {
    if (testStatusInterval) {
        clearInterval(testStatusInterval);
        testStatusInterval = null;
    }
}

// Update test status
async function updateTestStatus() {
    if (!currentTestId) return;
    
    try {
        const response = await fetch(`/api/settings/stress-test/${currentTestId}/status`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateTestProgress(data);
            updateTestResults(data.results);
            updateTestLogs(data.logs);
            
            if (data.status === 'completed' || data.status === 'stopped') {
                stopTestStatusPolling();
                updateTestUI('completed');
                document.getElementById('downloadReportBtn').disabled = false;
            }
        } else {
            console.error('Failed to get test status');
        }
    } catch (error) {
        console.error('Test status error:', error);
    }
}

// Update test progress
function updateTestProgress(data) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const progressPercent = document.getElementById('progressPercent');
    
    progressFill.style.width = `${data.progress}%`;
    progressText.textContent = `Test running... ${data.elapsedTime}s / ${data.totalDuration}s`;
    progressPercent.textContent = `${data.progress}%`;
}

// Update test results
function updateTestResults(results) {
    const successRate = results.totalRequests > 0 
        ? ((results.successfulRequests / results.totalRequests) * 100).toFixed(1)
        : '0';
    
    const avgResponseTime = results.responseTimes.length > 0
        ? Math.round(results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length)
        : 0;
    
    const throughput = results.totalRequests > 0
        ? (results.totalRequests / (Date.now() - (global.testStartTime || Date.now())) * 1000).toFixed(1)
        : '0';
    
    document.getElementById('successRate').textContent = `${successRate}%`;
    document.getElementById('avgResponseTime').textContent = `${avgResponseTime}ms`;
    document.getElementById('throughput').textContent = `${throughput} req/s`;
    document.getElementById('errorCount').textContent = results.failedRequests;
}

// Update test logs
function updateTestLogs(logs) {
    const logsContent = document.getElementById('logsContent');
    logsContent.innerHTML = logs.map(log => `
        <div class="log-entry">
            <span class="log-timestamp">${new Date(log.timestamp).toLocaleTimeString()}</span>
            <span class="log-level ${log.level}">${log.level.toUpperCase()}</span>
            <span class="log-message">${log.message}</span>
        </div>
    `).join('');
    
    // Auto-scroll to bottom
    logsContent.scrollTop = logsContent.scrollHeight;
}

// Update test UI based on status
function updateTestUI(status) {
    const startBtn = document.getElementById('startTestBtn');
    const stopBtn = document.getElementById('stopTestBtn');
    const progressDiv = document.getElementById('testProgress');
    const resultsDiv = document.getElementById('testResults');
    
    if (status === 'completed' || status === 'stopped') {
        startBtn.disabled = false;
        stopBtn.disabled = true;
        progressDiv.style.display = 'none';
        resultsDiv.style.display = 'block';
    }
}

// Download test report
async function downloadTestReport() {
    if (!currentTestId) {
        showToast('No test report available', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/settings/stress-test/${currentTestId}/report`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const report = await response.json();
            
            // Create and download CSV report
            const csvContent = generateCSVReport(report);
            downloadCSV(csvContent, `stress-test-report-${currentTestId}.csv`);
            
            showToast('Test report downloaded', 'success');
        } else {
            const errorData = await response.json();
            showToast(errorData.message || 'Failed to download report', 'error');
        }
    } catch (error) {
        console.error('Download report error:', error);
        showToast('Failed to download report', 'error');
    }
}

// Generate CSV report
function generateCSVReport(report) {
    const { summary, detailedResults } = report;
    
    let csv = 'Stress Test Report\n';
    csv += `Test ID,${report.testId}\n`;
    csv += `Timestamp,${report.timestamp}\n\n`;
    
    csv += 'Summary\n';
    csv += 'Metric,Value\n';
    csv += `Total Requests,${summary.totalRequests}\n`;
    csv += `Successful Requests,${summary.successfulRequests}\n`;
    csv += `Failed Requests,${summary.failedRequests}\n`;
    csv += `Success Rate,${summary.successRate}%\n`;
    csv += `Average Response Time,${summary.averageResponseTime}ms\n`;
    csv += `Throughput,${summary.throughput} req/s\n`;
    csv += `Total Time,${summary.totalTime}s\n\n`;
    
    csv += 'Configuration\n';
    csv += 'Parameter,Value\n';
    csv += `Concurrent Users,${report.config.concurrentUsers}\n`;
    csv += `Test Duration,${report.config.testDuration}s\n`;
    csv += `Request Rate,${report.config.requestRate} req/s\n`;
    csv += `Test Options,${JSON.stringify(report.config.testOptions)}\n\n`;
    
    if (detailedResults.errors.length > 0) {
        csv += 'Errors\n';
        csv += 'Timestamp,Message\n';
        detailedResults.errors.forEach(error => {
            csv += `${error.timestamp},${error.message}\n`;
        });
    }
    
    return csv;
}

// Download CSV file
function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Filter logs by level
function filterLogs() {
    const level = document.getElementById('logLevelFilter').value;
    const logEntries = document.querySelectorAll('.log-entry');
    
    logEntries.forEach(entry => {
        const logLevel = entry.querySelector('.log-level').textContent.toLowerCase();
        if (level === 'all' || logLevel === level) {
            entry.style.display = 'block';
        } else {
            entry.style.display = 'none';
        }
    });
}

// Clear logs
function clearLogs() {
    document.getElementById('logsContent').innerHTML = '';
}

// Authentication functions
async function handleLogin(event) {
    event.preventDefault();
    showLoading();
    
    const formData = new FormData(event.target);
    const loginData = {
        email: formData.get('email'),
        password: formData.get('password')
    };
    
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
            // Ensure SSE connection is established after login
            setTimeout(() => {
                if (!isEventStreamConnected) {
                    console.log('🔄 Establishing SSE connection after login...');
                    connectEventStream();
                }
            }, 1000);
            showToast('Login successful!', 'success');
        } else {
            showToast(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Login failed. Please try again.', 'error');
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
            showToast('Registration successful!', 'success');
        } else {
            showToast(data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Registration failed. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    closeMobileMenu(); // Close mobile menu on logout
    showLogin();
    showToast('Logged out successfully', 'info');
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
    navMenu.classList.toggle('active');
}

function closeMobileMenu() {
    const navMenu = document.getElementById('navMenu');
    navMenu.classList.remove('active');
}

// Dashboard functions

async function loadDashboard() {
    if (!currentUser || !hasRole('admin')) {
        return;
    }
    
    try {
        // Load door status data
        await loadDoorStatus();
        
        // Load recent events
        await loadEvents();
        
        // Note: Door status updates are handled via Server-Sent Events (SSE)
        // No need for manual refresh intervals
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}

async function loadDoorStatus() {
    try {
        const response = await fetch('/api/doors?limit=100', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Door status loaded:', data.doors.length, 'doors');
            displayDoorStatus(data.doors);
        } else {
            console.error('Failed to load door status');
        }
    } catch (error) {
        console.error('Load door status error:', error);
    }
}

function displayDoorStatus(doors) {
    const doorGrid = document.getElementById('doorGrid');
    
    if (!doors || doors.length === 0) {
        doorGrid.innerHTML = `
            <div class="door-card" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                <i class="fas fa-door-open" style="font-size: 2rem; color: #adb5bd; margin-bottom: 1rem;"></i>
                <h3 style="color: #6c757d; margin: 0 0 0.5rem 0;">No Doors Found</h3>
                <p style="color: #adb5bd; margin: 0;">No doors have been configured yet.</p>
            </div>
        `;
        return;
    }
    
    doorGrid.innerHTML = doors.map((door, index) => `
        <div class="door-card ${getDoorCardClass(door)}" style="animation-delay: ${index * 0.1}s;">
            <div class="door-header">
                <h3 class="door-name">${door.name}</h3>
                <div class="door-status-badge ${getDoorStatusBadgeClass(door)}">
                    ${getDoorStatusBadgeText(door)}
                </div>
            </div>
            <div class="door-location">${door.location}</div>
            
            <!-- Animated Door Visualization -->
            <div class="door-visualization">
                <div class="door-frame">
                    <div class="door-panel ${getDoorVisualClass(door)}">
                        <div class="door-handle ${getDoorHandleClass(door)}"></div>
                        <div class="door-lock ${getDoorLockClass(door)}"></div>
                    </div>
                    <div class="door-status-text">
                        <div class="status-primary">${getDoorPrimaryStatus(door)}</div>
                        <div class="status-secondary">${getDoorSecondaryStatus(door)}</div>
                    </div>
                </div>
            </div>
            
            <!-- Sensor Status -->
            <div class="sensor-status">
                <div class="sensor-item ${door.hasLockSensor ? 'available' : 'unavailable'}">
                    <i class="fas fa-lock"></i>
                    <span>Lock Sensor</span>
                </div>
                <div class="sensor-item ${door.hasDoorPositionSensor ? 'available' : 'unavailable'}">
                    <i class="fas fa-door-open"></i>
                    <span>Position Sensor</span>
                </div>
            </div>
            
            <div class="door-ip">${door.controllerIp}</div>
            <div class="door-last-seen">
                ${door.lastSeen ? `Last seen: ${formatDoorTime(door.lastSeen)}` : 'Never seen'}
            </div>
        </div>
    `).join('');
}

// Manual refresh function for user-triggered updates
function refreshDoorStatus() {
    loadDoorStatus();
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
        
        const response = await fetch(addCacheBusting(`/api/users?${params}`), {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
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
            showToast('Failed to load users', 'error');
        }
    } catch (error) {
        console.error('Failed to load users:', error);
        showToast('Failed to load users', 'error');
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
            <td><span class="status-indicator active">Active</span></td>
            <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit" onclick="editUser(${user.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn access-groups" onclick="manageUserAccessGroups(${user.id})">
                        <i class="fas fa-shield-alt"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteUser(${user.id})" ${user.id === currentUser.id ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i>
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
            showToast('User created successfully!', 'success');
        } else {
            showToast(data.message || 'Failed to create user', 'error');
        }
    } catch (error) {
        console.error('Create user error:', error);
        showToast('Failed to create user', 'error');
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
        showToast('Failed to load user data', 'error');
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
            showToast('User updated successfully!', 'success');
        } else {
            showToast(data.message || 'Failed to update user', 'error');
        }
    } catch (error) {
        console.error('Update user error:', error);
        showToast('Failed to update user', 'error');
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
            showToast('User deleted successfully!', 'success');
        } else {
            const data = await response.json();
            showToast(data.message || 'Failed to delete user', 'error');
        }
    } catch (error) {
        console.error('Delete user error:', error);
        showToast('Failed to delete user', 'error');
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
            showToast('Password changed successfully!', 'success');
        } else {
            showToast(data.message || 'Failed to change password', 'error');
        }
    } catch (error) {
        console.error('Change password error:', error);
        showToast('Failed to change password', 'error');
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

function showLoading() {
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'exclamation-circle' : 'info-circle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
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
        
        const response = await fetch(addCacheBusting(`/api/doors?${params}`), {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayDoors(data.doors);
            displayDoorsPagination(data.pagination);
        } else {
            showToast('Failed to load doors', 'error');
        }
    } catch (error) {
        console.error('Failed to load doors:', error);
        showToast('Failed to load doors', 'error');
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
                <span class="status-indicator ${door.isOnline ? 'online' : 'offline'}">
                    <i class="fas fa-circle"></i>
                    ${door.isOnline ? 'Online' : 'Offline'}
                </span>
            </td>
            <td>${door.lastSeen ? formatDoorTime(door.lastSeen) : 'Never'}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit" onclick="editDoor(${door.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteDoor(${door.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                    ${door.isOnline ? `
                        <button class="action-btn control" onclick="controlDoor(${door.id}, 'open')" title="Open Door">
                            <i class="fas fa-door-open"></i>
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
        const response = await fetch(`/api/doors/${doorId}/control`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ action })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast(data.message, 'success');
        } else {
            showToast(data.message || 'Failed to control door', 'error');
        }
    } catch (error) {
        console.error('Door control error:', error);
        showToast('Failed to control door', 'error');
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
            showToast('Door created successfully!', 'success');
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
                    showToast('Please fix the duplicate address errors below', 'error');
                } else {
                    showToast('Please fix the validation errors below', 'error');
                }
            } else {
                console.log('No validation errors, showing generic message');
                showToast(data.message || 'Failed to create door', 'error');
            }
        }
    } catch (error) {
        console.error('Create door error:', error);
        showToast('Failed to create door', 'error');
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
            showToast('Failed to load door details', 'error');
        }
    } catch (error) {
        console.error('Edit door error:', error);
        showToast('Failed to load door details', 'error');
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
            showToast('Door updated successfully!', 'success');
            closeModal('editDoorModal');
            refreshDoorRelatedUI();
        } else {
            // Handle validation errors
            if (data.errors) {
                displayDoorValidationErrors(data.errors);
                // Show a general error toast for validation failures
                const errorMessages = Object.values(data.errors);
                if (errorMessages.some(msg => msg.includes('already in use'))) {
                    showToast('Please fix the duplicate address errors below', 'error');
                } else {
                    showToast('Please fix the validation errors below', 'error');
                }
            } else {
                showToast(data.message || 'Failed to update door', 'error');
            }
        }
    } catch (error) {
        console.error('Update door error:', error);
        showToast('Failed to update door', 'error');
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
            showToast('Door deleted successfully!', 'success');
            refreshDoorRelatedUI();
        } else {
            const data = await response.json();
            showToast(data.message || 'Failed to delete door', 'error');
        }
    } catch (error) {
        console.error('Delete door error:', error);
        showToast('Failed to delete door', 'error');
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
        
        const response = await fetch(addCacheBusting(`/api/access-groups?${params}`), {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Access groups API response:', data);
            displayAccessGroups(data.accessGroups);
            displayAccessGroupsPagination(data.pagination);
        } else {
            console.error('Access groups API failed:', response.status, response.statusText);
            showToast('Failed to load access groups', 'error');
        }
    } catch (error) {
        console.error('Failed to load access groups:', error);
        showToast('Failed to load access groups', 'error');
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
                const response = await fetch(`/api/access-groups/${group.id}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
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
                    <button class="action-btn edit" onclick="editAccessGroup(${group.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn details" onclick="manageAccessGroupDetails(${group.id})" title="Manage Doors">
                        <i class="fas fa-door-open"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteAccessGroup(${group.id})">
                        <i class="fas fa-trash"></i>
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
            showToast('Access group created successfully!', 'success');
            closeModal('createAccessGroupModal');
            event.target.reset();
            loadAccessGroups();
        } else {
            showToast(data.message || 'Failed to create access group', 'error');
        }
    } catch (error) {
        console.error('Create access group error:', error);
        showToast('Failed to create access group', 'error');
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
            showToast('Failed to load access group details', 'error');
        }
    } catch (error) {
        console.error('Edit access group error:', error);
        showToast('Failed to load access group details', 'error');
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
            showToast('Access group updated successfully!', 'success');
            closeModal('editAccessGroupModal');
            loadAccessGroups();
        } else {
            showToast(data.message || 'Failed to update access group', 'error');
        }
    } catch (error) {
        console.error('Update access group error:', error);
        showToast('Failed to update access group', 'error');
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
            showToast('Access group deleted successfully!', 'success');
            loadAccessGroups();
        } else {
            const data = await response.json();
            showToast(data.message || 'Failed to delete access group', 'error');
        }
    } catch (error) {
        console.error('Delete access group error:', error);
        showToast('Failed to delete access group', 'error');
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
        const accessGroupsResponse = await fetch('/api/access-groups?limit=100', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (accessGroupsResponse.ok) {
            const accessGroupsData = await accessGroupsResponse.json();
            const allAccessGroups = accessGroupsData.accessGroups;
            
            // Get user's current access groups
            const userAccessGroupsResponse = await fetch(`/api/users/${userId}/access-groups`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
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
        showToast('Failed to load user access groups', 'error');
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
            showToast('User access groups updated successfully!', 'success');
            manageUserAccessGroups(currentUserId); // Reload the modal
        } else {
            const data = await response.json();
            showToast(data.message || 'Failed to update user access groups', 'error');
        }
    } catch (error) {
        console.error('Error updating user access groups:', error);
        showToast('Failed to update user access groups', 'error');
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




// Access Group-User Management Functions
let currentAccessGroupId = null;

async function manageAccessGroupDetails(accessGroupId) {
    currentAccessGroupId = accessGroupId;
    
    try {
        // Load access group details
        const accessGroupResponse = await fetch(`/api/access-groups/${accessGroupId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (accessGroupResponse.ok) {
            const accessGroupData = await accessGroupResponse.json();
            const accessGroup = accessGroupData.accessGroup;
            const currentDoors = accessGroupData.doors;
            
            // Load all doors for the checkboxes
            const doorsResponse = await fetch('/api/doors?limit=100', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (doorsResponse.ok) {
                const doorsData = await doorsResponse.json();
                const allDoors = doorsData.doors;
                
                // Display doors as checkboxes with current selection
                displayAccessGroupDoors(allDoors, currentDoors);
                
                document.getElementById('accessGroupDetailsModal').classList.add('active');
            } else {
                console.error('Failed to load doors:', doorsResponse.status, doorsResponse.statusText);
                showToast('Failed to load doors for selection', 'error');
            }
        } else {
            console.error('Failed to load access group:', accessGroupResponse.status, accessGroupResponse.statusText);
            showToast('Failed to load access group details', 'error');
        }
    } catch (error) {
        console.error('Error loading access group details:', error);
        showToast('Failed to load access group details', 'error');
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
    const accessGroupResponse = await fetch(`/api/access-groups/${currentAccessGroupId}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    });
    
    if (!accessGroupResponse.ok) {
        showToast('Failed to load current access group details', 'error');
        return;
    }
    
    const accessGroupData = await accessGroupResponse.json();
    const currentDoors = accessGroupData.doors;
    const currentDoorIds = currentDoors.map(door => door.id);
    
    // Find doors to add and remove
    const doorsToAdd = checkedDoorIds.filter(id => !currentDoorIds.includes(id));
    const doorsToRemove = currentDoorIds.filter(id => !checkedDoorIds.includes(id));
    
    if (doorsToAdd.length === 0 && doorsToRemove.length === 0) {
        showToast('No changes to save', 'info');
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
            let message = '';
            if (doorsToAdd.length > 0 && doorsToRemove.length > 0) {
                message = `${doorsToAdd.length} door(s) added, ${doorsToRemove.length} door(s) removed successfully!`;
            } else if (doorsToAdd.length > 0) {
                message = `${doorsToAdd.length} door(s) added successfully!`;
            } else {
                message = `${doorsToRemove.length} door(s) removed successfully!`;
            }
            showToast(message, 'success');
            manageAccessGroupDetails(currentAccessGroupId); // Reload the modal
        } else {
            showToast(`Some operations failed. ${failedResponses.length} out of ${promises.length} operations failed.`, 'warning');
            manageAccessGroupDetails(currentAccessGroupId); // Reload the modal
        }
    } catch (error) {
        console.error('Error updating access group doors:', error);
        showToast('Failed to update access group doors', 'error');
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




// Update the showSection function to handle new sections
function showSection(sectionName) {
    hideAllSections();
    document.getElementById(sectionName + 'Section').classList.add('active');
    currentSection = sectionName; // Track current section for auto-refresh
    
    // Close mobile menu after navigation
    closeMobileMenu();
    
    if (sectionName === 'dashboard') {
        loadDashboard();
        connectEventStream(); // Connect to live event stream
        // Door status updates are handled via Server-Sent Events (SSE)
    } else {
        connectEventStream(); // Keep SSE connection alive on all sections
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
        showToast('Failed to scan for Door Controller devices: ' + error.message, 'error');
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
        const response = await fetch('/api/access-groups?limit=100', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
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
        showToast('Failed to load access groups', 'error');
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
            showToast('Door Controller configured as door successfully!', 'success');
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
            showToast(data.message || 'Failed to configure Door Controller as door', 'error');
        }
    } catch (error) {
        console.error('Configure Door Controller error:', error);
        showToast('Failed to configure Door Controller as door', 'error');
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
            showToast('Door Controller connection test successful!', 'success');
        } else {
            showToast('Door Controller connection test failed', 'error');
        }
    } catch (error) {
        console.error('Door Controller connection test failed:', error);
        showToast('Door Controller connection test failed - device may be offline', 'error');
    } finally {
        hideLoading();
    }
}

async function addAllDiscoveredControllers() {
    if (discoveredControllers.length === 0) {
        showToast('No Door Controller devices to add', 'info');
        return;
    }
    
    if (!confirm(`Add all ${discoveredControllers.length} discovered Door Controller devices as doors?`)) {
        return;
    }
    
    showLoading();
    
    try {
        // Load access groups for default assignment
        const accessGroupsResponse = await fetch('/api/access-groups?limit=100', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
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
            showToast(`Successfully added ${successful} Door Controller device(s) as doors`, 'success');
        }
        
        if (failed > 0) {
            showToast(`Failed to add ${failed} Door Controller device(s)`, 'error');
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
        showToast('Failed to add Door Controller devices', 'error');
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
        showToast('Please fill in all required fields', 'error');
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
            showToast('Door Controller device configured successfully!', 'success');
            closeModal('doorControllerConfigModal');
            
            // Refresh the doors list if we're on that page
            if (currentSection === 'doors') {
                loadDoors();
            }
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to configure Door Controller device', 'error');
        }
    } catch (error) {
        console.error('Failed to configure Door Controller device:', error);
        showToast('Failed to configure Door Controller device', 'error');
    } finally {
        hideLoading();
    }
}

// Periodic door status updates
let doorStatusInterval;

function startDoorStatusUpdates() {
    // Update door status every 10 seconds for more responsive updates
    doorStatusInterval = setInterval(() => {
        if (currentUser && hasRole('admin') && currentSection === 'doors') {
            refreshDoorStatus();
        }
    }, 10000);
}

function stopDoorStatusUpdates() {
    if (doorStatusInterval) {
        clearInterval(doorStatusInterval);
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
        
        const response = await fetch(addCacheBusting(`/api/doors?${params}`), {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayDoors(data.doors);
            // Don't refresh pagination during auto-updates
        }
    } catch (error) {
        console.error('Failed to refresh door status:', error);
        // Don't show error toast for background updates
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

// Debug panel variables
let debugLogs = [];
let debugPanelVisible = false;

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
                addDebugLog(`Keep-alive ping successful: ${endpoint}`, 'info');
            } else {
                console.log(`⚠️ Frontend keep-alive ping failed: ${endpoint} (${response.status})`);
                addDebugLog(`Keep-alive ping failed: ${endpoint} (${response.status})`, 'warning');
            }
        } catch (error) {
            console.log(`❌ Frontend keep-alive ping error: ${endpoint} - ${error.message}`);
            addDebugLog(`Keep-alive ping error: ${endpoint} - ${error.message}`, 'error');
        }
    }, 5 * 60 * 1000); // 5 minutes - reduced frequency to fix SSE timeout
    
    // Disabled aggressive ping to reduce server load and fix SSE timeout
    console.log('🔄 Aggressive ping disabled to reduce server load');
    addDebugLog('Aggressive ping disabled to reduce server load', 'info');
    
    // Store null interval for cleanup
    window.aggressiveKeepAliveInterval = null;
    
    console.log('🔄 Frontend keep-alive mechanism started (5min only)');
    addDebugLog('Frontend keep-alive started (5min only)', 'info');
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
    addDebugLog('Frontend keep-alive stopped', 'info');
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
        
        const response = await fetch(addCacheBusting(`/api/events?${params}`), {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
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
            <div class="event-icon ${event.type}">
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
    // Clear existing interval
    if (eventRefreshInterval) {
        clearInterval(eventRefreshInterval);
    }
    
    // Start new interval - refresh every 10 seconds
    eventRefreshInterval = setInterval(() => {
        // Only refresh if we're on the dashboard and events are visible
        const dashboardSection = document.getElementById('dashboardSection');
        if (dashboardSection && dashboardSection.classList.contains('active')) {
            loadEvents(currentEventPage, currentEventFilters.type || '');
        }
    }, 10000);
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
    addDebugLog('Starting fetch streaming fallback', 'info');
    
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
        addDebugLog('Fetch streaming connected', 'success');
        isEventStreamConnected = true;
        updateEventStreamStatus(true);
        updateDebugStatus();
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        function readStream() {
            reader.read().then(({ done, value }) => {
                if (done) {
                    console.log('📡 Fetch stream ended');
                    addDebugLog('Fetch stream ended', 'warning');
                    isEventStreamConnected = false;
                    updateEventStreamStatus(false);
                    updateDebugStatus();
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
                addDebugLog(`Fetch stream error: ${error.message}`, 'error');
                isEventStreamConnected = false;
                updateEventStreamStatus(false);
                updateDebugStatus();
            });
        }
        
        readStream();
    })
    .catch(error => {
        console.error('❌ Fetch streaming failed:', error);
        addDebugLog(`Fetch streaming failed: ${error.message}`, 'error');
        isEventStreamConnected = false;
        updateEventStreamStatus(false);
        updateDebugStatus();
    });
}

function connectEventStream() {
    console.log('🔄 connectEventStream() called - EVENTSOURCE TEST VERSION');
    addDebugLog('Starting SSE connection attempt - EVENTSOURCE TEST VERSION', 'info');
    
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
    addDebugLog(`EventSource created for public endpoint, readyState: ${eventSource.readyState}`, 'info');
    
    // Add timeout to detect connection issues
    const connectionTimeout = setTimeout(() => {
        console.log('⏰ SSE timeout reached - checking connection state...');
        
        if (!eventSource) {
            console.log('❌ EventSource is null - cannot check connection state');
            addDebugLog('EventSource is null - connection failed', 'error');
            return;
        }
        
        console.log('⏰ EventSource readyState:', eventSource.readyState);
        console.log('⏰ EventSource URL:', eventSource.url);
        
        if (eventSource.readyState !== 1) {
            console.log('⏰ SSE connection timeout - readyState still:', eventSource.readyState);
            addDebugLog(`SSE connection timeout - readyState: ${eventSource.readyState}`, 'warning');
            
            // Try fetch streaming fallback
            console.log('🔄 Attempting fetch streaming fallback...');
            if (eventSource && eventSource.url) {
                console.log('🔄 EventSource URL for fetch streaming:', eventSource.url);
                addDebugLog('Attempting fetch streaming fallback', 'info');
                startFetchStreaming(eventSource.url);
            } else {
                console.log('❌ Cannot start fetch streaming - EventSource URL not available');
                addDebugLog('Cannot start fetch streaming - EventSource URL not available', 'error');
            }
        } else {
            console.log('✅ EventSource connected successfully before timeout');
            addDebugLog('EventSource connected successfully', 'success');
        }
    }, 10000); // 10 second timeout
    
            eventSource.onopen = function(event) {
                clearTimeout(connectionTimeout);
                console.log('✅ Event stream connected successfully - PUBLIC ENDPOINT');
                console.log('✅ Event object:', event);
                console.log('✅ EventSource readyState:', eventSource.readyState);
                console.log('✅ EventSource URL:', eventSource.url);
                addDebugLog('SSE connection established successfully - PUBLIC ENDPOINT', 'success');
        isEventStreamConnected = true;
        updateEventStreamStatus(true);
        updateDebugStatus();
        
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
                updateDebugStatus();
            }
        }, 1000);
    };
    
            eventSource.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    console.log('Received event stream data - PUBLIC ENDPOINT:', data);
                    addDebugLog(`Received event from public endpoint: ${data.type}`, 'info');
                    
                    if (data.type === 'connection') {
                        console.log('✅ Connection message received from public endpoint');
                        addDebugLog('Connection message received from public endpoint', 'success');
                    } else if (data.type === 'test') {
                        console.log('✅ Test message received from public endpoint');
                        addDebugLog('Test message received from public endpoint', 'success');
                    } else if (data.type === 'heartbeat') {
                        console.log('✅ Heartbeat received from public endpoint');
                        addDebugLog('Heartbeat received from public endpoint', 'info');
                    } else if (data.type === 'event') {
                        console.log('✅ Live event received from public endpoint:', data.event);
                        addDebugLog(`Live event received: ${data.event.type} ${data.event.action} - ${data.event.entityName}`, 'success');
                        
                        // Show a visual indicator that a new event was received
                        const eventLog = document.getElementById('eventLog');
                        if (eventLog) {
                            eventLog.style.borderLeft = '4px solid #28a745';
                            setTimeout(() => {
                                eventLog.style.borderLeft = '';
                            }, 2000);
                        }
                        
                        // Refresh the events list to show the new event
                        if (typeof loadEvents === 'function') {
                            console.log('🔄 Refreshing events list due to live event');
                            // Preserve current page and filter, but go to page 1 to show the new event
                            const currentType = document.getElementById('eventTypeFilter')?.value || '';
                            loadEvents(1, currentType);
                        }
                        
                        // Update other sections if needed
                        if (data.event.type === 'user' && typeof loadUsers === 'function') {
                            console.log('🔄 Refreshing users list due to user event');
                            loadUsers();
                        } else if (data.event.type === 'door' && typeof loadDoors === 'function') {
                            console.log('🔄 Refreshing doors list due to door event');
                            loadDoors();
                        }
                    } else if (data.type === 'new_event') {
                        console.log('✅ New event received from public endpoint:', data);
                        addDebugLog(`New event received: ${data.type}`, 'success');
                        
                        // Show a visual indicator that a new event was received
                        const eventLog = document.getElementById('eventLog');
                        if (eventLog) {
                            eventLog.style.borderLeft = '4px solid #28a745';
                            setTimeout(() => {
                                eventLog.style.borderLeft = '';
                            }, 2000);
                        }
                        
                        // Refresh the events list to show the new event
                        if (typeof loadEvents === 'function') {
                            console.log('🔄 Refreshing events list due to new event');
                            const currentType = document.getElementById('eventTypeFilter')?.value || '';
                            loadEvents(1, currentType);
                        }
                    }
                } catch (error) {
                    console.error('Error parsing event stream data:', error);
                    addDebugLog(`Error parsing event data: ${error.message}`, 'error');
                }
            };
    
    eventSource.onerror = function(event) {
        console.error('❌ Event stream error - PUBLIC ENDPOINT:', event);
        console.error('❌ Error details:');
        
        if (!eventSource) {
            console.error('❌ EventSource is null in error handler');
            addDebugLog('EventSource is null in error handler', 'error');
            return;
        }
        
        console.error('  - EventSource readyState:', eventSource.readyState);
        console.error('  - EventSource URL:', eventSource.url);
        console.error('  - EventSource withCredentials:', eventSource.withCredentials);
        console.error('  - Error event type:', event.type);
        console.error('  - Error event target:', event.target);
        console.error('  - Current page URL:', window.location.href);
        console.error('  - User agent:', navigator.userAgent);
        
                addDebugLog(`SSE error occurred on public endpoint: readyState=${eventSource.readyState}`, 'error');
        
        // Try to get more info about the error
        if (eventSource.readyState === 0) {
            console.error('❌ EventSource stuck in CONNECTING state - likely network/CORS issue');
            addDebugLog('EventSource stuck in CONNECTING state on public endpoint', 'error');
            
            // Try fetch streaming fallback immediately
            console.log('🔄 Attempting fetch streaming fallback...');
            if (eventSource && eventSource.url) {
                console.log('🔄 EventSource URL for fetch streaming:', eventSource.url);
                addDebugLog('Attempting fetch streaming fallback', 'info');
                startFetchStreaming(eventSource.url);
            } else {
                console.log('❌ Cannot start fetch streaming - EventSource URL not available');
                addDebugLog('Cannot start fetch streaming - EventSource URL not available', 'error');
            }
        } else if (eventSource.readyState === 2) {
            console.error('❌ EventSource CLOSED - connection was established but closed');
                    addDebugLog('EventSource connection was closed on public endpoint', 'error');
        }
        
        // Clear the timeout since we got an error
        clearTimeout(connectionTimeout);
        
        // Only mark as disconnected if readyState is CLOSED (2)
        if (eventSource.readyState === 2) {
            console.log('📡 Connection closed, marking as disconnected');
            addDebugLog('SSE connection closed, marking as disconnected', 'warning');
            isEventStreamConnected = false;
            updateEventStreamStatus(false);
            updateDebugStatus();
            
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
                    addDebugLog(`Attempting to reconnect SSE (attempt ${window.sseReconnectAttempts}/${maxReconnectAttempts})`, 'info');
                    
                    setTimeout(() => {
                        if (!isEventStreamConnected) {
                            connectEventStream();
                        }
                    }, delay);
                } else if (window.sseReconnectAttempts >= maxReconnectAttempts) {
                    console.log('❌ Max reconnection attempts reached, giving up');
                    addDebugLog('Max SSE reconnection attempts reached', 'error');
                }
            };
            
            attemptReconnect();
        } else {
            console.log('📡 Connection error but still open, keeping status as connected');
            addDebugLog('SSE error but connection still open, keeping status', 'warning');
        }
    };
}


function disconnectEventStream() {
    if (eventSource) {
        eventSource.close();
        eventSource = null;
        isEventStreamConnected = false;
        updateEventStreamStatus(false);
        updateDebugStatus();
        addDebugLog('SSE connection manually disconnected', 'info');
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
            addDebugLog('SSE health check failed, reconnecting', 'warning');
            
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
            addDebugLog('Page visible, reconnecting SSE', 'info');
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
        <div class="event-icon ${event.type}">
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
    addDebugLog(`Updating status indicator: ${connected ? 'Live' : 'Offline'}`, 'info');
    
    const eventControls = document.querySelector('#eventsSection .header-actions');
    if (!eventControls) {
        console.log('❌ Event controls not found');
        addDebugLog('Event controls element not found', 'error');
        return;
    }
    
    // Remove existing status indicator
    const existingStatus = eventControls.querySelector('.stream-status');
    if (existingStatus) {
        existingStatus.remove();
        addDebugLog('Removed existing status indicator', 'info');
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
    addDebugLog(`Status indicator added to DOM: ${connected ? 'Live' : 'Offline'}`, 'success');
    
    // Force a re-render by adding a small delay and checking
    setTimeout(() => {
        const checkStatus = eventControls.querySelector('.stream-status');
        if (checkStatus) {
            console.log(`✅ Status confirmed in DOM: ${checkStatus.textContent.trim()}`);
            addDebugLog(`Status confirmed in DOM: ${checkStatus.textContent.trim()}`, 'success');
        } else {
            console.log('❌ Status indicator not found in DOM after creation');
            addDebugLog('Status indicator not found in DOM after creation', 'error');
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

// Debug Panel Functions
function addDebugLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
        timestamp,
        message,
        type
    };
    
    debugLogs.push(logEntry);
    
    // Keep only last 50 logs
    if (debugLogs.length > 50) {
        debugLogs.shift();
    }
    
    updateDebugLogDisplay();
}

function updateDebugLogDisplay() {
    const container = document.getElementById('debugLogContainer');
    if (!container) return;
    
    container.innerHTML = debugLogs.map(log => 
        `<div class="log-entry ${log.type}">[${log.timestamp}] ${log.message}</div>`
    ).join('');
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function updateDebugStatus() {
    // Update SSE connection status
    const sseStatus = document.getElementById('debugSseStatus');
    if (sseStatus) {
        sseStatus.textContent = isEventStreamConnected ? 'Connected' : 'Disconnected';
        sseStatus.className = `status-badge ${isEventStreamConnected ? 'connected' : 'disconnected'}`;
    }
    
    // Update EventSource state
    const eventSourceState = document.getElementById('debugEventSourceState');
    if (eventSourceState && eventSource) {
        const states = ['CONNECTING', 'OPEN', 'CLOSED'];
        eventSourceState.textContent = states[eventSource.readyState] || 'Unknown';
        eventSourceState.className = `status-badge ${
            eventSource.readyState === 1 ? 'connected' : 
            eventSource.readyState === 2 ? 'disconnected' : 'unknown'
        }`;
    }
    
    // Update connection URL
    const connectionUrl = document.getElementById('debugConnectionUrl');
    if (connectionUrl && eventSource) {
        connectionUrl.textContent = eventSource.url || 'Not connected';
    }
}

function toggleDebugPanel() {
    const panel = document.getElementById('debugPanel');
    const toggleIcon = document.getElementById('debugToggleIcon');
    const toggleText = document.getElementById('debugToggleText');
    
    if (!panel) return;
    
    debugPanelVisible = !debugPanelVisible;
    
    if (debugPanelVisible) {
        panel.style.display = 'block';
        toggleIcon.className = 'fas fa-eye-slash';
        toggleText.textContent = 'Hide Debug';
        updateDebugStatus();
        addDebugLog('Debug panel opened', 'info');
        // Fetch server logs when panel opens
        fetchServerLogs();
    } else {
        panel.style.display = 'none';
        toggleIcon.className = 'fas fa-eye';
        toggleText.textContent = 'Show Debug';
        addDebugLog('Debug panel closed', 'info');
    }
}

function clearDebugLog() {
    debugLogs = [];
    updateDebugLogDisplay();
    addDebugLog('Debug log cleared', 'info');
}

// Server logs functionality
let serverLogs = [];

function copyClientLogs() {
    const logText = debugLogs.map(log => `[${log.timestamp}] ${log.message}`).join('\n');
    navigator.clipboard.writeText(logText).then(() => {
        addDebugLog('Client logs copied to clipboard', 'success');
        showToast('Client logs copied to clipboard!', 'success');
    }).catch(err => {
        addDebugLog('Failed to copy client logs: ' + err.message, 'error');
        showToast('Failed to copy logs', 'error');
    });
}

function copyServerLogs() {
    const logText = serverLogs.map(log => `[${log.timestamp}] ${log.message}`).join('\n');
    navigator.clipboard.writeText(logText).then(() => {
        addDebugLog('Server logs copied to clipboard', 'success');
        showToast('Server logs copied to clipboard!', 'success');
    }).catch(err => {
        addDebugLog('Failed to copy server logs: ' + err.message, 'error');
        showToast('Failed to copy logs', 'error');
    });
}

function clearServerLogs() {
    serverLogs = [];
    updateServerLogDisplay();
    addDebugLog('Server logs cleared', 'info');
}

function updateServerLogDisplay() {
    const container = document.getElementById('serverLogContainer');
    if (!container) return;
    
    container.innerHTML = serverLogs.map(log => 
        `<div class="log-entry ${log.type}">[${log.timestamp}] ${log.message}</div>`
    ).join('');
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function addServerLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
        timestamp,
        message,
        type
    };
    
    serverLogs.push(logEntry);
    
    // Keep only last 100 logs
    if (serverLogs.length > 100) {
        serverLogs.shift();
    }
    
    updateServerLogDisplay();
}

function fetchServerLogs() {
    addDebugLog('Fetching server logs...', 'info');
    
    fetch('/api/events/debug-status')
        .then(response => response.json())
        .then(data => {
            addServerLog('Server debug status fetched successfully', 'success');
            addServerLog(`Total connections: ${data.totalConnections}`, 'info');
            addServerLog(`Active connections: ${data.connections.length}`, 'info');
            
            data.connections.forEach((conn, index) => {
                addServerLog(`Connection ${index + 1}: User ${conn.userId}, Active: ${conn.isActive}`, 'info');
            });
        })
        .catch(error => {
            addServerLog(`Failed to fetch server logs: ${error.message}`, 'error');
            addDebugLog(`Server log fetch failed: ${error.message}`, 'error');
        });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupEventListeners();
    // Start periodic door status updates
    startDoorStatusUpdates();
    // Start keep-alive mechanism
    startKeepAlive();
});

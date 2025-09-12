// Global variables
let currentUser = null;
let currentPage = 1;
let currentFilters = {};
let currentSection = 'dashboard';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupEventListeners();
});

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
}

function showRegister() {
    hideAllSections();
    document.getElementById('registerSection').classList.add('active');
}

function showAuthenticatedUI() {
    hideAllSections();
    document.getElementById('dashboardSection').classList.add('active');
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
let doorRefreshInterval = null;

async function loadDashboard() {
    if (!currentUser || !hasRole('admin')) {
        return;
    }
    
    try {
        // Load door status data
        await loadDoorStatus();
        
        // Load recent events
        await loadEvents();
        
        // Start door status refresh
        startDoorStatusRefresh();
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
    
    doorGrid.innerHTML = doors.map(door => `
        <div class="door-card ${door.isOnline ? 'online' : 'offline'}">
            <div class="door-header">
                <h3 class="door-name">${door.name}</h3>
                <div class="door-status-indicator ${door.isOnline ? 'online' : 'offline'}"></div>
            </div>
            <div class="door-location">${door.location}</div>
            <div class="door-status-grid">
                <div class="door-status-item">
                    <div class="door-status-icon ${getLockStatusClass(door)}">
                        <i class="fas ${getLockStatusIcon(door)}"></i>
                    </div>
                    <span class="door-status-text">${getLockStatusText(door)}</span>
                </div>
                       <div class="door-status-item">
                           <div class="door-status-icon ${getDoorPositionClass(door)}">
                               <i class="fas ${getDoorPositionIcon(door)}"></i>
                           </div>
                           <span class="door-status-text">${getDoorPositionText(door)}</span>
                       </div>
            </div>
            <div class="door-ip">${door.controllerIp}</div>
            <div class="door-last-seen">
                ${door.lastSeen ? `Last seen: ${formatDoorTime(door.lastSeen)}` : 'Never seen'}
            </div>
        </div>
    `).join('');
}

function startDoorStatusRefresh() {
    // Clear existing interval
    if (doorRefreshInterval) {
        clearInterval(doorRefreshInterval);
    }
    
    // Start new interval - refresh every 5 seconds for more responsive updates
    doorRefreshInterval = setInterval(() => {
        // Only refresh if we're on the dashboard
        const dashboardSection = document.getElementById('dashboardSection');
        if (dashboardSection && dashboardSection.classList.contains('active')) {
            console.log('Refreshing door status...');
            loadDoorStatus();
        }
    }, 5000); // Reduced to 5 seconds for more responsive updates
}

function stopDoorStatusRefresh() {
    if (doorRefreshInterval) {
        clearInterval(doorRefreshInterval);
        doorRefreshInterval = null;
    }
}

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

function getLockStatusClass(door) {
    // If door is offline, show unknown status
    if (!door.isOnline) {
        return 'unknown';
    }
    
    // If door doesn't have a lock sensor, show N/A
    if (!door.hasLockSensor) {
        return 'na';
    }
    
    // If isLocked is explicitly false, show unlocked
    if (door.isLocked === false) {
        return 'unlocked';
    }
    
    // If isLocked is explicitly true, show locked
    if (door.isLocked === true) {
        return 'locked';
    }
    
    // If isLocked is null/undefined, show unknown
    return 'unknown';
}

function getLockStatusIcon(door) {
    const statusClass = getLockStatusClass(door);
    
    switch (statusClass) {
        case 'locked':
            return 'fa-lock';
        case 'unlocked':
            return 'fa-unlock';
        case 'na':
            return 'fa-minus';
        case 'unknown':
        default:
            return 'fa-question';
    }
}

function getLockStatusText(door) {
    const statusClass = getLockStatusClass(door);
    
    switch (statusClass) {
        case 'locked':
            return 'Locked';
        case 'unlocked':
            return 'Unlocked';
        case 'na':
            return 'N/A';
        case 'unknown':
        default:
            return 'Unknown';
    }
}

function getDoorPositionClass(door) {
    // If door is offline, show unknown status
    if (!door.isOnline) {
        return 'unknown';
    }
    
    // If door doesn't have a door position sensor, show N/A
    if (!door.hasDoorPositionSensor) {
        return 'na';
    }
    
    // If isOpen is explicitly false, show closed
    if (door.isOpen === false) {
        return 'closed';
    }
    
    // If isOpen is explicitly true, show open
    if (door.isOpen === true) {
        return 'open';
    }
    
    // If isOpen is null/undefined, show unknown
    return 'unknown';
}

function getDoorPositionIcon(door) {
    const statusClass = getDoorPositionClass(door);
    
    switch (statusClass) {
        case 'open':
            return 'fa-door-open';
        case 'closed':
            return 'fa-door-closed';
        case 'na':
            return 'fa-minus';
        case 'unknown':
        default:
            return 'fa-question';
    }
}

function getDoorPositionText(door) {
    const statusClass = getDoorPositionClass(door);
    
    switch (statusClass) {
        case 'open':
            return 'Open';
        case 'closed':
            return 'Closed';
        case 'na':
            return 'N/A';
        case 'unknown':
        default:
            return 'Unknown';
    }
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
        
        const response = await fetch(`/api/users?${params}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayUsers(data.users);
            // Simple pagination - just show all users for now
            displaySimplePagination(data.totalCount);
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
        
        const response = await fetch(`/api/doors?${params}`, {
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
            loadDoors();
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
            loadDoors();
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
            loadDoors();
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
        
        const response = await fetch(`/api/access-groups?${params}`, {
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
            
            
            // Display available access groups as checkboxes
            displayAvailableUserAccessGroups(allAccessGroups, currentAccessGroups);
            
            // Display current access groups
            displayUserCurrentAccessGroups(currentAccessGroups);
            
            document.getElementById('userAccessGroupsModal').classList.add('active');
        }
    } catch (error) {
        console.error('Error loading user access groups:', error);
        showToast('Failed to load user access groups', 'error');
    }
}

function displayAvailableUserAccessGroups(allAccessGroups, currentAccessGroups) {
    const container = document.getElementById('userAccessGroupsCheckboxList');
    const currentGroupIds = currentAccessGroups.map(group => group.id);
    
    container.innerHTML = allAccessGroups.map(group => {
        const isAlreadyAssigned = currentGroupIds.includes(group.id);
        const isChecked = isAlreadyAssigned;
        
        return `
            <div class="door-checkbox-item">
                <label>
                    <input type="checkbox" 
                           value="${group.id}" 
                           ${isChecked ? 'checked' : ''}>
                    <div class="door-info">
                        <div class="door-name">${group.name}</div>
                        <div class="door-details">${group.description || 'No description'}</div>
                    </div>
                    <div class="door-status ${isAlreadyAssigned ? 'already-added' : 'available'}">
                        ${isAlreadyAssigned ? 'Currently Assigned' : 'Available'}
                    </div>
                </label>
            </div>
        `;
    }).join('');
}

function displayUserCurrentAccessGroups(accessGroups) {
    const container = document.getElementById('userCurrentAccessGroupsList');
    
    if (accessGroups.length === 0) {
        container.innerHTML = '<div class="text-muted">No access groups assigned to this user</div>';
        return;
    }
    
    container.innerHTML = accessGroups.map(group => `
        <div class="door-item">
            <div class="door-info">
                <div class="door-name">${group.name}</div>
                <div class="door-details">${group.description || 'No description'}</div>
            </div>
            <button class="remove-btn" onclick="removeAccessGroupFromUser(${group.id})">
                <i class="fas fa-times"></i> Remove
            </button>
        </div>
    `).join('');
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

async function removeAccessGroupFromUser(accessGroupId) {
    if (!confirm('Are you sure you want to remove this access group from the user?')) {
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`/api/access-groups/${accessGroupId}/users/${currentUserId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showToast('Access group removed from user successfully!', 'success');
            manageUserAccessGroups(currentUserId); // Reload the modal
        } else {
            const data = await response.json();
            showToast(data.message || 'Failed to remove access group from user', 'error');
        }
    } catch (error) {
        console.error('Error removing access group from user:', error);
        showToast('Failed to remove access group from user', 'error');
    } finally {
        hideLoading();
    }
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
                
                console.log('Loaded doors for checkboxes:', allDoors);
                console.log('Current doors in access group:', currentDoors);
                
                // Display available doors as checkboxes
                displayAvailableDoors(allDoors, currentDoors);
                
                // Display current doors
                displayAccessGroupDoors(currentDoors);
                
                document.getElementById('accessGroupDetailsModal').classList.add('active');
            } else {
                console.error('Failed to load doors:', doorsResponse.status, doorsResponse.statusText);
                showToast('Failed to load doors for selection', 'error');
            }
        }
    } catch (error) {
        console.error('Error loading access group details:', error);
        showToast('Failed to load access group details', 'error');
    }
}

function displayAvailableDoors(allDoors, currentDoors) {
    const container = document.getElementById('availableDoorsList');
    const currentDoorIds = currentDoors.map(door => door.id);
    
    container.innerHTML = allDoors.map(door => {
        const isAlreadyAdded = currentDoorIds.includes(door.id);
        const statusClass = isAlreadyAdded ? 'already-added' : 'available';
        const statusText = isAlreadyAdded ? 'Already Added' : 'Available';
        
        return `
            <div class="door-checkbox-item">
                <input type="checkbox" 
                       id="door_${door.id}" 
                       value="${door.id}" 
                       ${isAlreadyAdded ? 'disabled' : ''}>
                <label for="door_${door.id}">
                    <div class="door-info">
                        <div class="door-name">${door.name}</div>
                        <div class="door-details">
                            <i class="fas fa-map-marker-alt"></i>
                            ${door.location} 
                            <i class="fas fa-wifi"></i>
                            ${door.controllerIp}
                        </div>
                    </div>
                </label>
                <span class="door-status ${statusClass}">${statusText}</span>
            </div>
        `;
    }).join('');
}

function displayAccessGroupDoors(doors) {
    const container = document.getElementById('accessGroupDoorsList');
    if (doors.length === 0) {
        container.innerHTML = `
            <div class="text-muted">
                <i class="fas fa-door-open" style="font-size: 24px; margin-bottom: 8px; display: block; opacity: 0.5;"></i>
                No doors assigned to this access group.
            </div>
        `;
        return;
    }
    
    container.innerHTML = doors.map(door => `
        <div class="door-item">
            <div class="door-info">
                <div class="door-name">${door.name}</div>
                <div class="door-details">
                    <i class="fas fa-map-marker-alt"></i>
                    ${door.location} 
                    <i class="fas fa-wifi"></i>
                    ${door.controllerIp || 'N/A'}
                </div>
            </div>
            <button class="remove-btn" onclick="removeDoorFromAccessGroup(${door.id})">
                <i class="fas fa-times"></i> Remove
            </button>
        </div>
    `).join('');
}



async function addSelectedDoorsToAccessGroup() {
    const checkboxes = document.querySelectorAll('#availableDoorsList input[type="checkbox"]:checked:not(:disabled)');
    
    if (checkboxes.length === 0) {
        showToast('Please select at least one door to add', 'error');
        return;
    }
    
    const doorIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    console.log('Adding doors to access group:', { doorIds, currentAccessGroupId });
    
    showLoading();
    
    try {
        // Add doors one by one (since the API doesn't support bulk operations yet)
        const promises = doorIds.map(doorId => 
            fetch(`/api/access-groups/${currentAccessGroupId}/doors`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ doorId })
            })
        );
        
        const responses = await Promise.all(promises);
        const failedResponses = responses.filter(response => !response.ok);
        
        if (failedResponses.length === 0) {
            console.log('All doors added to access group successfully');
            showToast(`${doorIds.length} door(s) added to access group successfully!`, 'success');
            manageAccessGroupDetails(currentAccessGroupId); // Reload the modal
        } else {
            console.error('Some doors failed to add:', failedResponses.length);
            showToast(`${doorIds.length - failedResponses.length} door(s) added, ${failedResponses.length} failed`, 'warning');
            manageAccessGroupDetails(currentAccessGroupId); // Reload the modal
        }
    } catch (error) {
        console.error('Error adding doors to access group:', error);
        showToast('Failed to add doors to access group', 'error');
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

async function removeDoorFromAccessGroup(doorId) {
    if (!confirm('Are you sure you want to remove this door from the access group?')) {
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`/api/access-groups/${currentAccessGroupId}/doors/${doorId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showToast('Door removed from access group successfully!', 'success');
            manageAccessGroupDetails(currentAccessGroupId); // Reload the modal
        } else {
            const data = await response.json();
            showToast(data.message || 'Failed to remove door from access group', 'error');
        }
    } catch (error) {
        console.error('Error removing door from access group:', error);
        showToast('Failed to remove door from access group', 'error');
    } finally {
        hideLoading();
    }
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
        startEventRefresh(); // Start event refresh when on dashboard
        startDoorStatusRefresh(); // Start door status refresh when on dashboard
    } else {
        stopEventRefresh(); // Stop event refresh when leaving dashboard
        stopDoorStatusRefresh(); // Stop door refresh when leaving dashboard
        if (sectionName === 'users') {
            loadUsers();
        } else if (sectionName === 'doors') {
            loadDoors();
        } else if (sectionName === 'accessGroups') {
            loadAccessGroups();
        } else if (sectionName === 'doorControllerDiscovery') {
            loadDoorControllerDiscovery();
        } else if (sectionName === 'profile') {
            updateProfileInfo();
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
            document.getElementById('doorControllerConfigModal').style.display = 'block';
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

function closeDoorControllerConfigModal() {
    document.getElementById('doorControllerConfigModal').style.display = 'none';
    document.getElementById('doorControllerConfigForm').reset();
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
            closeDoorControllerConfigModal();
            
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
        
        const response = await fetch(`/api/doors?${params}`, {
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
let eventRefreshInterval = null;

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
        
        const response = await fetch(`/api/events?${params}`, {
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
    
    eventLog.innerHTML = events.map(event => `
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
                    <div class="event-details">${event.details}</div>
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
    `).join('');
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
                onclick="loadEvents(${pagination.currentPage - 1}, '${currentEventType}')">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // Page numbers
    const startPage = Math.max(1, pagination.currentPage - 2);
    const endPage = Math.min(pagination.totalPages, pagination.currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="${i === pagination.currentPage ? 'active' : ''}" 
                    onclick="loadEvents(${i}, '${currentEventType}')">
                ${i}
            </button>
        `;
    }
    
    // Next button
    paginationHTML += `
        <button ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''} 
                onclick="loadEvents(${pagination.currentPage + 1}, '${currentEventType}')">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    paginationHTML += '</div>';
    paginationDiv.innerHTML = paginationHTML;
}

function filterEvents() {
    const typeFilter = document.getElementById('eventTypeFilter');
    const selectedType = typeFilter.value;
    loadEvents(1, selectedType);
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
            loadEvents(currentEventPage, currentEventType);
        }
    }, 10000);
}

function stopEventRefresh() {
    if (eventRefreshInterval) {
        clearInterval(eventRefreshInterval);
        eventRefreshInterval = null;
    }
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

// Initialize periodic updates when the app loads
document.addEventListener('DOMContentLoaded', function() {
    // Start periodic door status updates
    startDoorStatusUpdates();
});

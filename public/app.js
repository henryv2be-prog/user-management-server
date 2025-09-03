// Global variables
console.log('App.js loaded successfully');
let currentUser = null;
let currentPage = 1;
let currentFilters = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing app');
    checkAuthStatus();
    setupEventListeners();
    
    // Test if login button exists and add click handler
    const loginButton = document.querySelector('#loginForm button[type="submit"]');
    if (loginButton) {
        console.log('Login button found, adding click handler');
        loginButton.addEventListener('click', function(e) {
            console.log('Login button clicked!');
        });
    } else {
        console.error('Login button not found!');
    }
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
}

// Authentication functions
async function handleLogin(event) {
    console.log('=== LOGIN FUNCTION CALLED ===');
    console.log('Login form submitted');
    event.preventDefault();
    showLoading();
    
    const formData = new FormData(event.target);
    const loginData = {
        email: formData.get('email'),
        password: formData.get('password')
    };
    
    console.log('Login data:', loginData);
    
    try {
        console.log('Sending login request to /api/auth/login');
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        console.log('Login response status:', response.status);
        const data = await response.json();
        console.log('Login response data:', data);
        
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
        email: formData.get('email'),
        password: formData.get('password'),
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName')
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
            showToast('Registration successful! Please login.', 'success');
            document.getElementById('registerForm').reset();
            showLogin();
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
    showLogin();
    showToast('Logged out successfully', 'info');
}

// UI Navigation functions
function showLogin() {
    hideAllSections();
    const loginSection = document.getElementById('loginSection');
    const registerSection = document.getElementById('registerSection');
    
    if (loginSection) {
        loginSection.classList.add('active');
    } else {
        console.error('Login section not found');
    }
    
    if (registerSection) {
        registerSection.classList.remove('active');
    }
}

function showRegister() {
    hideAllSections();
    const registerSection = document.getElementById('registerSection');
    
    if (registerSection) {
        registerSection.classList.add('active');
    } else {
        console.error('Register section not found');
    }
}

function showAuthenticatedUI() {
    console.log('Showing authenticated UI');
    showSection('dashboard');
}



function hideAllSections() {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));
}

function toggleNav() {
    const navMenu = document.getElementById('navMenu');
    navMenu.classList.toggle('active');
}

// Dashboard functions
async function loadDashboard() {
    if (!currentUser || !hasRole('admin')) {
        return;
    }
    
    try {
        // Load user stats
        const userStatsResponse = await fetch('/api/users/stats/overview', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        // Load door stats
        const doorStatsResponse = await fetch('/api/doors?limit=1', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        // Load access group stats
        const accessGroupStatsResponse = await fetch('/api/access-groups?limit=1', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        let stats = {};
        
        if (userStatsResponse.ok) {
            const userData = await userStatsResponse.json();
            stats.totalUsers = userData.stats?.totalUsers || 0;
            stats.activeUsers = userData.stats?.activeUsers || 0;
            stats.adminUsers = userData.stats?.adminUsers || 0;
        }
        
        if (doorStatsResponse.ok) {
            const doorData = await doorStatsResponse.json();
            stats.totalDoors = doorData.totalCount || 0;
        }
        
        if (accessGroupStatsResponse.ok) {
            const accessGroupData = await accessGroupStatsResponse.json();
            stats.totalAccessGroups = accessGroupData.totalCount || 0;
        }
        
        updateDashboardStats(stats);
    } catch (error) {
        console.error('Failed to load dashboard stats:', error);
    }
}

function updateDashboardStats(stats) {
    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid) {
        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-users"></i>
                </div>
                <div class="stat-content">
                    <h3>${stats.totalUsers || 0}</h3>
                    <p>Total Users</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <div class="stat-icon">
                        <i class="fas fa-door-open"></i>
                    </div>
                </div>
                <div class="stat-content">
                    <h3>${stats.totalDoors || 0}</h3>
                    <p>Total Doors</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-layer-group"></i>
                </div>
                <div class="stat-content">
                    <h3>${stats.totalAccessGroups || 0}</h3>
                    <p>Access Groups</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-user-shield"></i>
                </div>
                <div class="stat-content">
                    <h3>${stats.adminUsers || 0}</h3>
                    <p>Admin Users</p>
                </div>
            </div>
        `;
    }
}

// User management functions
async function loadUsers() {
    if (!currentUser || !hasRole('admin')) {
        showToast('Access denied. Admin privileges required.', 'error');
        return;
    }
    
    try {
        showLoading();
        const response = await fetch('/api/users', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayUsers(data.users);
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to load users', 'error');
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
    if (tbody) {
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.first_name || ''} ${user.last_name || ''}</td>
                <td>${user.email}</td>
                <td><span class="role-badge ${user.role}">${user.role}</span></td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="editUser(${user.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})" ${user.id === currentUser.id ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

async function editUser(userId) {
    try {
        showLoading();
        const response = await fetch(`/api/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            populateEditUserForm(data.user);
            document.getElementById('editUserModal').classList.add('active');
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to load user', 'error');
        }
    } catch (error) {
        console.error('Failed to load user:', error);
        showToast('Failed to load user', 'error');
    } finally {
        hideLoading();
    }
}

function populateEditUserForm(user) {
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editFirstName').value = user.first_name || '';
    document.getElementById('editLastName').value = user.last_name || '';
    document.getElementById('editEmail').value = user.email;
    document.getElementById('editRole').value = user.role;
}

async function handleEditUser(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const userId = formData.get('id');
    const userData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        role: formData.get('role')
    };
    
    try {
        showLoading();
        const response = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            showToast('User updated successfully', 'success');
            document.getElementById('editUserModal').classList.remove('active');
            loadUsers();
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to update user', 'error');
        }
    } catch (error) {
        console.error('Failed to update user:', error);
        showToast('Failed to update user', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) {
        return;
    }
    
    try {
        showLoading();
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showToast('User deleted successfully', 'success');
            loadUsers();
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to delete user', 'error');
        }
    } catch (error) {
        console.error('Failed to delete user:', error);
        showToast('Failed to delete user', 'error');
    } finally {
        hideLoading();
    }
}

// Door management functions
async function loadDoors() {
    if (!currentUser || !hasRole('admin')) {
        showToast('Access denied. Admin privileges required.', 'error');
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
            displayDoors(data.doors);
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to load doors', 'error');
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
    if (tbody) {
        tbody.innerHTML = doors.map(door => `
            <tr>
                <td>${door.name}</td>
                <td>${door.location || 'N/A'}</td>
                <td>${door.esp32_ip || 'N/A'}</td>
                <td>${door.esp32_mac || 'N/A'}</td>
                <td>${new Date(door.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="editDoor(${door.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteDoor(${door.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

// Access group management functions
async function loadAccessGroups() {
    if (!currentUser || !hasRole('admin')) {
        showToast('Access denied. Admin privileges required.', 'error');
        return;
    }
    
    try {
        showLoading();
        const response = await fetch('/api/access-groups', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayAccessGroups(data.accessGroups);
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to load access groups', 'error');
        }
    } catch (error) {
        console.error('Failed to load access groups:', error);
        showToast('Failed to load access groups', 'error');
    } finally {
        hideLoading();
    }
}

function displayAccessGroups(accessGroups) {
    const tbody = document.getElementById('accessGroupsTableBody');
    if (tbody) {
        tbody.innerHTML = accessGroups.map(group => `
            <tr>
                <td>${group.name}</td>
                <td>${group.description || 'N/A'}</td>
                <td>${new Date(group.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteAccessGroup(${group.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

// Profile functions
function updateProfileInfo() {
    if (currentUser) {
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        const profileRole = document.getElementById('profileRole');
        
        if (profileName) profileName.textContent = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || 'N/A';
        if (profileEmail) profileEmail.textContent = currentUser.email;
        if (profileRole) profileRole.textContent = currentUser.role;
    }
}

function showChangePasswordModal() {
    document.getElementById('changePasswordModal').classList.add('active');
    document.getElementById('changePasswordForm').reset();
}

async function handleChangePassword(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const passwordData = {
        currentPassword: formData.get('currentPassword'),
        newPassword: formData.get('newPassword')
    };
    
    try {
        showLoading();
        const response = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(passwordData)
        });
        
        if (response.ok) {
            showToast('Password changed successfully', 'success');
            document.getElementById('changePasswordModal').classList.remove('active');
            event.target.reset();
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to change password', 'error');
        }
    } catch (error) {
        console.error('Failed to change password:', error);
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
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('active');
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
    }
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    
    if (!toastContainer) {
        console.error('Toast container not found');
        console.log(`Toast message: ${message} (${type})`);
        return;
    }
    
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
        if (toast.parentNode) {
            toast.remove();
        }
    }, 5000);
}

// Helper function to check if user has role
function hasRole(role) {
    return currentUser && currentUser.role === role;
}

// Search and filter functions
function searchUsers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const roleFilter = document.getElementById('roleFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    // Implement search logic
    loadUsers();
}

function filterUsers() {
    searchUsers();
}

function searchDoors() {
    const searchTerm = document.getElementById('doorSearchInput').value.toLowerCase();
    const statusFilter = document.getElementById('doorStatusFilter').value;
    
    // Implement search logic
    loadDoors();
}

function filterDoors() {
    searchDoors();
}

function searchAccessGroups() {
    const searchTerm = document.getElementById('accessGroupSearchInput').value.toLowerCase();
    const statusFilter = document.getElementById('accessGroupStatusFilter').value;
    
    // Implement search logic
    loadAccessGroups();
}

function filterAccessGroups() {
    searchAccessGroups();
}

// Create user modal functions
function showCreateUserModal() {
    document.getElementById('createUserModal').classList.add('active');
    document.getElementById('createUserForm').reset();
    loadAccessGroupsForUser();
}

async function handleCreateUser(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const userData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: formData.get('role'),
        accessGroupId: formData.get('accessGroupId') || null
    };
    
    try {
        showLoading();
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            showToast('User created successfully', 'success');
            document.getElementById('createUserModal').classList.remove('active');
            event.target.reset();
            loadUsers();
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to create user', 'error');
        }
    } catch (error) {
        console.error('Failed to create user:', error);
        showToast('Failed to create user', 'error');
    } finally {
        hideLoading();
    }
}

// Create door modal functions
function showCreateDoorModal() {
    document.getElementById('createDoorModal').classList.add('active');
    loadAccessGroupsForDoor();
}

async function handleCreateDoor(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const doorData = {
        name: formData.get('name'),
        location: formData.get('location'),
        esp32Ip: formData.get('esp32Ip'),
        esp32Mac: formData.get('esp32Mac'),
        accessGroupId: formData.get('accessGroupId') || null
    };
    
    try {
        showLoading();
        const response = await fetch('/api/doors', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(doorData)
        });
        
        if (response.ok) {
            showToast('Door created successfully', 'success');
            document.getElementById('createDoorModal').classList.remove('active');
            event.target.reset();
            loadDoors();
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to create door', 'error');
        }
    } catch (error) {
        console.error('Failed to create door:', error);
        showToast('Failed to create door', 'error');
    } finally {
        hideLoading();
    }
}

async function editDoor(doorId) {
    try {
        showLoading();
        const response = await fetch(`/api/doors/${doorId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            populateEditDoorForm(data.door);
            document.getElementById('editDoorModal').classList.add('active');
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to load door', 'error');
        }
    } catch (error) {
        console.error('Failed to load door:', error);
        showToast('Failed to load door', 'error');
    } finally {
        hideLoading();
    }
}

function populateEditDoorForm(door) {
    document.getElementById('editDoorId').value = door.id;
    document.getElementById('editDoorName').value = door.name;
    document.getElementById('editDoorLocation').value = door.location || '';
    document.getElementById('editDoorEsp32Ip').value = door.esp32_ip || '';
    document.getElementById('editDoorEsp32Mac').value = door.esp32_mac || '';
}

async function handleEditDoor(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const doorId = formData.get('id');
    const doorData = {
        name: formData.get('name'),
        location: formData.get('location'),
        esp32Ip: formData.get('esp32Ip'),
        esp32Mac: formData.get('esp32Mac')
    };
    
    try {
        showLoading();
        const response = await fetch(`/api/doors/${doorId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(doorData)
        });
        
        if (response.ok) {
            showToast('Door updated successfully', 'success');
            document.getElementById('editDoorModal').classList.remove('active');
            loadDoors();
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to update door', 'error');
        }
    } catch (error) {
        console.error('Failed to update door:', error);
        showToast('Failed to update door', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteDoor(doorId) {
    if (!confirm('Are you sure you want to delete this door?')) {
        return;
    }
    
    try {
        showLoading();
        const response = await fetch(`/api/doors/${doorId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showToast('Door deleted successfully', 'success');
            loadDoors();
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to delete door', 'error');
        }
    } catch (error) {
        console.error('Failed to delete door:', error);
        showToast('Failed to delete door', 'error');
    } finally {
        hideLoading();
    }
}

// Create access group modal functions
function showCreateAccessGroupModal() {
    document.getElementById('createAccessGroupModal').classList.add('active');
}

async function handleCreateAccessGroup(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const accessGroupData = {
        name: formData.get('name'),
        description: formData.get('description')
    };
    
    try {
        showLoading();
        const response = await fetch('/api/access-groups', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(accessGroupData)
        });
        
        if (response.ok) {
            showToast('Access group created successfully', 'success');
            document.getElementById('createAccessGroupModal').classList.remove('active');
            event.target.reset();
            loadAccessGroups();
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to create access group', 'error');
        }
    } catch (error) {
        console.error('Failed to create access group:', error);
        showToast('Failed to create access group', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteAccessGroup(accessGroupId) {
    if (!confirm('Are you sure you want to delete this access group?')) {
        return;
    }
    
    try {
        showLoading();
        const response = await fetch(`/api/access-groups/${accessGroupId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showToast('Access group deleted successfully', 'success');
            loadAccessGroups();
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to delete access group', 'error');
        }
    } catch (error) {
        console.error('Failed to delete access group:', error);
        showToast('Failed to delete access group', 'error');
    } finally {
        hideLoading();
    }
}

function showSection(sectionName) {
    hideAllSections();
    const sectionElement = document.getElementById(sectionName + 'Section');
    if (sectionElement) {
        sectionElement.classList.add('active');
    } else {
        console.error(`Section element not found: ${sectionName}Section`);
        return;
    }
    
    if (sectionName === 'dashboard') {
        loadDashboard();
    } else if (sectionName === 'users') {
        loadUsers();
    } else if (sectionName === 'doors') {
        loadDoors();
    } else if (sectionName === 'accessGroups') {
        loadAccessGroups();
    } else if (sectionName === 'profile') {
        updateProfileInfo();
    }
}

// Load access groups for door creation dropdown
async function loadAccessGroupsForDoor() {
    try {
        const response = await fetch('/api/access-groups?limit=100', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const select = document.getElementById('createDoorAccessGroup');
            if (select && data.accessGroups) {
                select.innerHTML = '<option value="">Select Access Group (Optional)</option>' +
                    data.accessGroups.map(group => 
                        `<option value="${group.id}">${group.name}</option>`
                    ).join('');
            }
        }
    } catch (error) {
        console.error('Failed to load access groups for door:', error);
    }
}

// Load access groups for user creation dropdown
async function loadAccessGroupsForUser() {
    try {
        const response = await fetch('/api/access-groups?limit=100', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const select = document.getElementById('createUserAccessGroup');
            if (select && data.accessGroups) {
                select.innerHTML = '<option value="">Select Access Group (Optional)</option>' +
                    data.accessGroups.map(group => 
                        `<option value="${group.id}">${group.name}</option>`
                    ).join('');
            }
        }
    } catch (error) {
        console.error('Failed to load access groups for user:', error);
    }
}
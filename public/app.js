// Global variables
let currentUser = null;
let currentPage = 1;
let currentFilters = {};

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

function showSection(sectionName) {
    hideAllSections();
    document.getElementById(sectionName + 'Section').classList.add('active');
    
    if (sectionName === 'dashboard') {
        loadDashboard();
    } else if (sectionName === 'users') {
        loadUsers();
    } else if (sectionName === 'profile') {
        updateProfileInfo();
    }
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
            stats = { ...userData.stats };
        }
        
        if (doorStatsResponse.ok) {
            const doorData = await doorStatsResponse.json();
            stats.totalDoors = doorData.pagination.totalCount;
        }
        
        if (accessGroupStatsResponse.ok) {
            const accessGroupData = await accessGroupStatsResponse.json();
            stats.totalAccessGroups = accessGroupData.pagination.totalCount;
        }
        
        displayStats(stats);
    } catch (error) {
        console.error('Failed to load dashboard stats:', error);
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
        <div class="stat-card moderators">
            <i class="fas fa-user-cog"></i>
            <h3>${stats.moderatorUsers}</h3>
            <p>Moderators</p>
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
            displayPagination(data.pagination);
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
            <td><span class="status-indicator ${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
            <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit" onclick="editUser(${user.id})">
                        <i class="fas fa-edit"></i>
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
            document.getElementById('editIsActive').value = user.isActive.toString();
            
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
        role: formData.get('role'),
        isActive: formData.get('isActive') === 'true'
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
            <td>${door.esp32Ip}</td>
            <td><span class="status-indicator ${door.isActive ? 'active' : 'inactive'}">${door.isActive ? 'Active' : 'Inactive'}</span></td>
            <td>${door.lastSeen ? new Date(door.lastSeen).toLocaleString() : 'Never'}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit" onclick="editDoor(${door.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn access-groups" onclick="manageDoorAccessGroups(${door.id})">
                        <i class="fas fa-shield-alt"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteDoor(${door.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
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
        esp32Ip: formData.get('esp32Ip'),
        esp32Mac: formData.get('esp32Mac')
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
            showToast('Door created successfully!', 'success');
            closeModal('createDoorModal');
            event.target.reset();
            loadDoors();
        } else {
            showToast(data.message || 'Failed to create door', 'error');
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
            document.getElementById('editDoorEsp32Ip').value = door.esp32Ip;
            document.getElementById('editDoorEsp32Mac').value = door.esp32Mac || '';
            document.getElementById('editDoorIsActive').value = door.isActive.toString();
            
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
        esp32Ip: formData.get('esp32Ip'),
        esp32Mac: formData.get('esp32Mac'),
        isActive: formData.get('isActive') === 'true'
    };
    
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
            showToast(data.message || 'Failed to update door', 'error');
        }
    } catch (error) {
        console.error('Update door error:', error);
        showToast('Failed to update door', 'error');
    } finally {
        hideLoading();
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
        
        const response = await fetch(`/api/access-groups?${params}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayAccessGroups(data.accessGroups);
            displayAccessGroupsPagination(data.pagination);
        } else {
            showToast('Failed to load access groups', 'error');
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
    tbody.innerHTML = accessGroups.map(group => `
        <tr>
            <td>${group.name}</td>
            <td>${group.description || 'No description'}</td>
            <td><span class="status-indicator ${group.isActive ? 'active' : 'inactive'}">${group.isActive ? 'Active' : 'Inactive'}</span></td>
            <td>${new Date(group.createdAt).toLocaleDateString()}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit" onclick="editAccessGroup(${group.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn details" onclick="manageAccessGroupDetails(${group.id})">
                        <i class="fas fa-info-circle"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteAccessGroup(${group.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
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

function filterAccessGroups() {
    const statusFilter = document.getElementById('accessGroupStatusFilter').value;
    currentFilters.isActive = statusFilter;
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
            document.getElementById('editAccessGroupIsActive').value = accessGroup.isActive.toString();
            
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
        description: formData.get('description'),
        isActive: formData.get('isActive') === 'true'
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

// Door-Access Group Management Functions
let currentDoorId = null;

async function manageDoorAccessGroups(doorId) {
    currentDoorId = doorId;
    
    try {
        // Load door details
        const doorResponse = await fetch(`/api/doors/${doorId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (doorResponse.ok) {
            const doorData = await doorResponse.json();
            const door = doorData.door;
            const currentAccessGroups = doorData.accessGroups;
            
            // Load all access groups for the dropdown
            const accessGroupsResponse = await fetch('/api/access-groups?limit=100', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (accessGroupsResponse.ok) {
                const accessGroupsData = await accessGroupsResponse.json();
                const allAccessGroups = accessGroupsData.accessGroups;
                
                // Populate dropdown with access groups not already assigned
                const dropdown = document.getElementById('doorAccessGroupSelect');
                dropdown.innerHTML = '<option value="">Select an access group...</option>';
                
                allAccessGroups.forEach(group => {
                    if (!currentAccessGroups.find(ag => ag.id === group.id)) {
                        dropdown.innerHTML += `<option value="${group.id}">${group.name}</option>`;
                    }
                });
                
                // Display current access groups
                displayDoorAccessGroups(currentAccessGroups);
                
                document.getElementById('doorAccessGroupsModal').classList.add('active');
            }
        }
    } catch (error) {
        console.error('Error loading door access groups:', error);
        showToast('Failed to load door access groups', 'error');
    }
}

function displayDoorAccessGroups(accessGroups) {
    const container = document.getElementById('doorAccessGroupsList');
    container.innerHTML = accessGroups.map(group => `
        <div class="access-group-item">
            <div>
                <strong>${group.name}</strong>
                ${group.description ? `<br><small>${group.description}</small>` : ''}
            </div>
            <button class="remove-btn" onclick="removeAccessGroupFromDoor(${group.id})">
                <i class="fas fa-times"></i> Remove
            </button>
        </div>
    `).join('');
}

async function addAccessGroupToDoor() {
    const accessGroupId = document.getElementById('doorAccessGroupSelect').value;
    
    if (!accessGroupId) {
        showToast('Please select an access group', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`/api/doors/${currentDoorId}/access-groups`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ accessGroupId: parseInt(accessGroupId) })
        });
        
        if (response.ok) {
            showToast('Access group added to door successfully!', 'success');
            manageDoorAccessGroups(currentDoorId); // Reload the modal
        } else {
            const data = await response.json();
            showToast(data.message || 'Failed to add access group to door', 'error');
        }
    } catch (error) {
        console.error('Error adding access group to door:', error);
        showToast('Failed to add access group to door', 'error');
    } finally {
        hideLoading();
    }
}

async function removeAccessGroupFromDoor(accessGroupId) {
    if (!confirm('Are you sure you want to remove this access group from the door?')) {
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`/api/doors/${currentDoorId}/access-groups/${accessGroupId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showToast('Access group removed from door successfully!', 'success');
            manageDoorAccessGroups(currentDoorId); // Reload the modal
        } else {
            const data = await response.json();
            showToast(data.message || 'Failed to remove access group from door', 'error');
        }
    } catch (error) {
        console.error('Error removing access group from door:', error);
        showToast('Failed to remove access group from door', 'error');
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
            const doors = accessGroupData.doors;
            const users = accessGroupData.users;
            
            // Load all doors for the dropdown
            const doorsResponse = await fetch('/api/doors?limit=100', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            // Load all users for the dropdown
            const usersResponse = await fetch('/api/users?limit=100', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (doorsResponse.ok && usersResponse.ok) {
                const doorsData = await doorsResponse.json();
                const usersData = await usersResponse.json();
                const allDoors = doorsData.doors;
                const allUsers = usersData.users;
                
                // Populate door dropdown
                const doorDropdown = document.getElementById('accessGroupDoorSelect');
                doorDropdown.innerHTML = '<option value="">Select a door...</option>';
                
                allDoors.forEach(door => {
                    if (!doors.find(d => d.id === door.id)) {
                        doorDropdown.innerHTML += `<option value="${door.id}">${door.name} (${door.location})</option>`;
                    }
                });
                
                // Populate user dropdown
                const userDropdown = document.getElementById('accessGroupUserSelect');
                userDropdown.innerHTML = '<option value="">Select a user...</option>';
                
                allUsers.forEach(user => {
                    if (!users.find(u => u.id === user.id)) {
                        userDropdown.innerHTML += `<option value="${user.id}">${user.firstName} ${user.lastName} (${user.email})</option>`;
                    }
                });
                
                // Display current doors and users
                displayAccessGroupDoors(doors);
                displayAccessGroupUsers(users);
                
                document.getElementById('accessGroupDetailsModal').classList.add('active');
            }
        }
    } catch (error) {
        console.error('Error loading access group details:', error);
        showToast('Failed to load access group details', 'error');
    }
}

function displayAccessGroupDoors(doors) {
    const container = document.getElementById('accessGroupDoorsList');
    container.innerHTML = doors.map(door => `
        <div class="door-item">
            <div>
                <strong>${door.name}</strong>
                <br><small>${door.location} (${door.esp32Ip})</small>
            </div>
            <button class="remove-btn" onclick="removeDoorFromAccessGroup(${door.id})">
                <i class="fas fa-times"></i> Remove
            </button>
        </div>
    `).join('');
}

function displayAccessGroupUsers(users) {
    const container = document.getElementById('accessGroupUsersList');
    container.innerHTML = users.map(user => `
        <div class="user-item">
            <div>
                <strong>${user.firstName} ${user.lastName}</strong>
                <br><small>${user.email}</small>
                ${user.expires_at ? `<br><small>Expires: ${new Date(user.expires_at).toLocaleDateString()}</small>` : ''}
            </div>
            <button class="remove-btn" onclick="removeUserFromAccessGroup(${user.id})">
                <i class="fas fa-times"></i> Remove
            </button>
        </div>
    `).join('');
}

async function addDoorToAccessGroup() {
    const doorId = document.getElementById('accessGroupDoorSelect').value;
    
    if (!doorId) {
        showToast('Please select a door', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`/api/access-groups/${currentAccessGroupId}/doors`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ doorId: parseInt(doorId) })
        });
        
        if (response.ok) {
            showToast('Door added to access group successfully!', 'success');
            manageAccessGroupDetails(currentAccessGroupId); // Reload the modal
        } else {
            const data = await response.json();
            showToast(data.message || 'Failed to add door to access group', 'error');
        }
    } catch (error) {
        console.error('Error adding door to access group:', error);
        showToast('Failed to add door to access group', 'error');
    } finally {
        hideLoading();
    }
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

async function addUserToAccessGroup() {
    const userId = document.getElementById('accessGroupUserSelect').value;
    const expiresAt = document.getElementById('accessGroupUserExpires').value;
    
    if (!userId) {
        showToast('Please select a user', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`/api/access-groups/${currentAccessGroupId}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ 
                userId: parseInt(userId),
                expiresAt: expiresAt || null
            })
        });
        
        if (response.ok) {
            showToast('User added to access group successfully!', 'success');
            document.getElementById('accessGroupUserSelect').value = '';
            document.getElementById('accessGroupUserExpires').value = '';
            manageAccessGroupDetails(currentAccessGroupId); // Reload the modal
        } else {
            const data = await response.json();
            showToast(data.message || 'Failed to add user to access group', 'error');
        }
    } catch (error) {
        console.error('Error adding user to access group:', error);
        showToast('Failed to add user to access group', 'error');
    } finally {
        hideLoading();
    }
}

async function removeUserFromAccessGroup(userId) {
    if (!confirm('Are you sure you want to remove this user from the access group?')) {
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`/api/access-groups/${currentAccessGroupId}/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showToast('User removed from access group successfully!', 'success');
            manageAccessGroupDetails(currentAccessGroupId); // Reload the modal
        } else {
            const data = await response.json();
            showToast(data.message || 'Failed to remove user from access group', 'error');
        }
    } catch (error) {
        console.error('Error removing user from access group:', error);
        showToast('Failed to remove user from access group', 'error');
    } finally {
        hideLoading();
    }
}

// Tab functionality for access group details modal
function showAccessGroupTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(`accessGroup${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`).classList.add('active');
    
    // Add active class to clicked tab button
    event.target.classList.add('active');
}

// Update the showSection function to handle new sections
function showSection(sectionName) {
    hideAllSections();
    document.getElementById(sectionName + 'Section').classList.add('active');
    
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

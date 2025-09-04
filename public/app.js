// Global variables
console.log('App.js loaded successfully');
let currentUser = null;
let currentPage = 1;
let currentFilters = {};
let currentSection = null;
let autoRefreshInterval = null;

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
        console.log('Loading dashboard stats...');
        
        // Load user stats
        const userStatsResponse = await fetch('/api/users', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        // Load door stats
        const doorStatsResponse = await fetch('/api/doors', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        // Load access group stats
        const accessGroupStatsResponse = await fetch('/api/access-groups', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        let stats = {};
        
        if (userStatsResponse.ok) {
            const userData = await userStatsResponse.json();
            console.log('User stats response:', userData);
            stats.totalUsers = userData.users?.length || userData.totalCount || 0;
            stats.adminUsers = userData.users?.filter(u => u.role === 'admin').length || 0;
        } else {
            console.error('User stats failed:', userStatsResponse.status);
        }
        
        if (doorStatsResponse.ok) {
            const doorData = await doorStatsResponse.json();
            console.log('Door stats response:', doorData);
            stats.totalDoors = doorData.doors?.length || doorData.pagination?.totalCount || 0;
        } else {
            console.error('Door stats failed:', doorStatsResponse.status);
        }
        
        if (accessGroupStatsResponse.ok) {
            const accessGroupData = await accessGroupStatsResponse.json();
            console.log('Access group stats response:', accessGroupData);
            stats.totalAccessGroups = accessGroupData.accessGroups?.length || accessGroupData.pagination?.totalCount || 0;
        } else {
            console.error('Access group stats failed:', accessGroupStatsResponse.status);
        }
        
        console.log('Final dashboard stats:', stats);
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
        const response = await fetch('/api/users/with-access-groups', {
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
                <td>${user.firstName || ''} ${user.lastName || ''}</td>
                <td>${user.email}</td>
                <td><span class="role-badge ${user.role}">${user.role}</span></td>
                <td>${user.accessGroups && user.accessGroups.length > 0 ? 
                      user.accessGroups.map(ag => `<span class="access-group-tag">${ag.name}</span>`).join(' ') : 
                      '<span class="no-groups">None</span>'}</td>
                <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="editUser(${user.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn access-groups" onclick="manageUserAccessGroups(${user.id}, '${user.firstName} ${user.lastName}')">
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
    document.getElementById('editFirstName').value = user.firstName || '';
    document.getElementById('editLastName').value = user.lastName || '';
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
            displayDoorsPagination(data.pagination);
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
    tbody.innerHTML = doors.map(door => {
        // Determine if door is online (last seen within 10 seconds)
        const isOnline = door.lastSeen && 
                        (new Date() - new Date(door.lastSeen)) < 10 * 1000;
        
        return `
        <tr>
            <td>${door.name}</td>
            <td>${door.location}</td>
            <td>${door.esp32Ip || 'N/A'}</td>
            <td>${door.esp32Mac || 'N/A'}</td>
            <td>${door.accessGroup ? door.accessGroup.name : 'None'}</td>
            <td>
                <span class="status-indicator ${isOnline ? 'online' : 'offline'}">
                    <i class="fas fa-circle"></i>
                    ${isOnline ? 'Online' : 'Offline'}
                </span>
            </td>
            <td>${door.createdAt ? new Date(door.createdAt).toLocaleDateString() : 'N/A'}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit" onclick="editDoor(${door.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteDoor(${door.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// Update only the status column of doors table (prevents blinking)
async function updateDoorsStatusOnly() {
    try {
        // NO showLoading() call here - silent update
        const response = await fetch('/api/doors', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const tbody = document.getElementById('doorsTableBody');
            const rows = tbody.querySelectorAll('tr');
            
            // Update only the status column for each row
            data.doors.forEach((door, index) => {
                if (rows[index]) {
                    const statusCell = rows[index].cells[5]; // Status column (6th column, index 5)
                    if (statusCell) {
                        // Determine if door is online (last seen within 10 seconds)
                        const isOnline = door.lastSeen && 
                                        (new Date() - new Date(door.lastSeen)) < 10 * 1000;
                        
                        statusCell.innerHTML = `
                            <span class="status-indicator ${isOnline ? 'online' : 'offline'}">
                                <i class="fas fa-circle"></i>
                                ${isOnline ? 'Online' : 'Offline'}
                            </span>
                        `;
                    }
                }
            });
        }
        // NO hideLoading() call here - silent update
    } catch (error) {
        console.error('Failed to update doors status:', error);
        // Fall back to full refresh if status-only update fails
        loadDoors();
    }
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

// Create door
function createDoor() {
    loadAccessGroupsForDoor();
    openModal('createDoorModal');
}

// Handle create door form submission
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
            closeModal('createDoorModal');
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

// Edit door
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
            const door = data.door;
            
            document.getElementById('editDoorId').value = door.id;
            document.getElementById('editDoorName').value = door.name;
            document.getElementById('editDoorLocation').value = door.location;
            document.getElementById('editDoorEsp32Ip').value = door.esp32Ip || '';
            document.getElementById('editDoorEsp32Mac').value = door.esp32Mac || '';
            
            // Load access groups for the edit dropdown and set current selection
            await loadAccessGroupsForEditDoor(door.accessGroupId);
            
            document.getElementById('editDoorModal').classList.add('active');
        } else {
            showToast('Failed to load door details', 'error');
        }
    } catch (error) {
        console.error('Edit door error:', error);
        showToast('Failed to load door details', 'error');
    } finally {
        hideLoading();
    }
}

// Handle edit door form submission
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
        accessGroupId: formData.get('accessGroupId') || null
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
        
        if (response.ok) {
            showToast('Door updated successfully', 'success');
            closeModal('editDoorModal');
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

// Delete door
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
            console.log('Access groups API response:', data);
            
            if (data.accessGroups && Array.isArray(data.accessGroups)) {
                displayAccessGroups(data.accessGroups);
                displayAccessGroupsPagination(data.pagination);
            } else {
                console.error('Invalid access groups data structure:', data);
                showToast('Invalid data received from server', 'error');
            }
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

function displayAccessGroups(accessGroups) {
    console.log('Displaying access groups:', accessGroups);
    const tbody = document.getElementById('accessGroupsTableBody');
    tbody.innerHTML = accessGroups.map(group => `
        <tr>
            <td>${group.name}</td>
            <td>${group.description || 'No description'}</td>
            <td>${new Date(group.createdAt).toLocaleDateString()}</td>
            <td>
                <div class="action-buttons">
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
            <button class="${i === page ? 'active' : ''}" onclick="loadAccessGroups(${i})">
                ${i}
            </button>
        `;
    }
    
    paginationHTML += `
        <button ${!hasNext ? 'disabled' : ''} onclick="loadAccessGroups(${page + 1})">
            Next <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    paginationDiv.innerHTML = paginationHTML;
}

// Create access group
function createAccessGroup() {
    openModal('createAccessGroupModal');
}

// Handle create access group form submission
async function handleCreateAccessGroup(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const accessGroupData = {
        name: formData.get('name'),
        description: formData.get('description')
    };
    
    console.log('Creating access group with data:', accessGroupData);
    
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
        
        console.log('Access group creation response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Access group creation response data:', data);
            showToast('Access group created successfully', 'success');
            closeModal('createAccessGroupModal');
            event.target.reset();
            loadAccessGroups();
        } else {
            const error = await response.json();
            console.error('Access group creation error:', error);
            showToast(error.message || 'Failed to create access group', 'error');
        }
    } catch (error) {
        console.error('Failed to create access group:', error);
        showToast('Failed to create access group', 'error');
    } finally {
        hideLoading();
    }
}

// Delete access group
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

// Profile functions
function updateProfileInfo() {
    if (currentUser) {
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        const profileRole = document.getElementById('profileRole');
        
        if (profileName) profileName.textContent = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'N/A';
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

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
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

// Create access group modal functions
function showCreateAccessGroupModal() {
    document.getElementById('createAccessGroupModal').classList.add('active');
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
    
    // Clear any existing auto-refresh
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
    
    currentSection = sectionName;
    
    if (sectionName === 'dashboard') {
        loadDashboard();
    } else if (sectionName === 'users') {
        loadUsers();
    } else if (sectionName === 'doors') {
        loadDoors();
        // Start auto-refresh for doors table (every 5 seconds for real-time status)
        autoRefreshInterval = setInterval(() => {
            if (currentSection === 'doors') {
                console.log('Auto-refreshing doors status only...');
                updateDoorsStatusOnly();
            }
        }, 5000); // 5 seconds
    } else if (sectionName === 'accessGroups') {
        loadAccessGroups();
    } else if (sectionName === 'esp32Discovery') {
        loadEsp32Discovery();
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

// Load access groups for door edit dropdown
async function loadAccessGroupsForEditDoor(currentAccessGroupId = null) {
    try {
        const response = await fetch('/api/access-groups?limit=100', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const select = document.getElementById('editDoorAccessGroup');
            if (select && data.accessGroups && Array.isArray(data.accessGroups)) {
                select.innerHTML = '<option value="">Select Access Group (Optional)</option>' +
                    data.accessGroups.map(group => 
                        `<option value="${group.id}" ${group.id == currentAccessGroupId ? 'selected' : ''}>${group.name}</option>`
                    ).join('');
            }
        }
    } catch (error) {
        console.error('Failed to load access groups for door edit:', error);
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

// Manage user access groups with checkboxes
async function manageUserAccessGroups(userId, userName) {
    try {
        console.log('Managing access groups for user:', userId, userName);
        showLoading();
        
        // Load user's current access groups and all available access groups
        console.log('Fetching user access groups and all access groups...');
        const [userResponse, allGroupsResponse] = await Promise.all([
            fetch(`/api/users/${userId}/access-groups`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            }),
            fetch('/api/access-groups?limit=100', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
        ]);
        
        console.log('User response status:', userResponse.status);
        console.log('All groups response status:', allGroupsResponse.status);
        
        if (userResponse.ok && allGroupsResponse.ok) {
            const userData = await userResponse.json();
            const allGroupsData = await allGroupsResponse.json();
            
            console.log('User data:', userData);
            console.log('All groups data:', allGroupsData);
            
            // Set user info
            document.getElementById('manageUserId').value = userId;
            document.getElementById('manageUserName').textContent = userName;
            
            // Create checkbox list
            const checkboxList = document.getElementById('accessGroupsCheckboxList');
            const userAccessGroupIds = userData.accessGroups.map(ag => ag.id);
            
            checkboxList.innerHTML = allGroupsData.accessGroups.map(group => `
                <div class="checkbox-item">
                    <input type="checkbox" 
                           id="accessGroup_${group.id}" 
                           name="accessGroupIds" 
                           value="${group.id}" 
                           ${userAccessGroupIds.includes(group.id) ? 'checked' : ''}>
                    <label for="accessGroup_${group.id}">
                        <strong>${group.name}</strong>
                        ${group.description ? `<br><small>${group.description}</small>` : ''}
                    </label>
                </div>
            `).join('');
            
            document.getElementById('userAccessGroupsModal').classList.add('active');
        } else {
            console.error('API responses not ok:', {
                userResponse: userResponse.status,
                allGroupsResponse: allGroupsResponse.status
            });
            
            if (!userResponse.ok) {
                const userError = await userResponse.json();
                console.error('User access groups API error:', userError);
            }
            
            if (!allGroupsResponse.ok) {
                const groupsError = await allGroupsResponse.json();
                console.error('All access groups API error:', groupsError);
            }
            
            showToast('Failed to load access groups data', 'error');
        }
    } catch (error) {
        console.error('Failed to load user access groups:', error);
        showToast('Failed to load user access groups', 'error');
    } finally {
        hideLoading();
    }
}

// Handle user access groups form submission
async function handleUserAccessGroupsUpdate(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const userId = formData.get('userId');
    
    // Get all checked access group IDs
    const selectedAccessGroupIds = [];
    const checkboxes = event.target.querySelectorAll('input[name="accessGroupIds"]:checked');
    checkboxes.forEach(checkbox => {
        selectedAccessGroupIds.push(parseInt(checkbox.value));
    });
    
    try {
        showLoading();
        const response = await fetch(`/api/users/${userId}/access-groups`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                accessGroupIds: selectedAccessGroupIds
            })
        });
        
        if (response.ok) {
            showToast('User access groups updated successfully', 'success');
            closeModal('userAccessGroupsModal');
            loadUsers(); // Refresh the users list
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to update user access groups', 'error');
        }
    } catch (error) {
        console.error('Failed to update user access groups:', error);
        showToast('Failed to update user access groups', 'error');
    } finally {
        hideLoading();
    }
}

// ESP32 Discovery Functions
let discoveredEsp32s = [];
let scanInProgress = false;

async function loadEsp32Discovery() {
    if (!currentUser || !hasRole('admin')) {
        return;
    }
    
    // Reset the discovery state
    discoveredEsp32s = [];
    scanInProgress = false;
    
    // Show initial scan status
    updateScanStatus('ready');
    displayDiscoveredEsp32s();
}

function updateScanStatus(status) {
    const scanStatusDiv = document.getElementById('scanStatus');
    
    switch (status) {
        case 'ready':
            scanStatusDiv.innerHTML = `
                <div class="scan-info">
                    <i class="fas fa-info-circle"></i>
                    <span>Click "Scan for ESP32s" to discover devices on your network</span>
                </div>
            `;
            break;
        case 'scanning':
            scanStatusDiv.innerHTML = `
                <div class="scan-info scanning">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Scanning network for ESP32 devices...</span>
                </div>
            `;
            break;
        case 'complete':
            scanStatusDiv.innerHTML = `
                <div class="scan-info success">
                    <i class="fas fa-check-circle"></i>
                    <span>Scan complete! Found ${discoveredEsp32s.length} ESP32 device(s)</span>
                </div>
            `;
            break;
        case 'error':
            scanStatusDiv.innerHTML = `
                <div class="scan-info error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Scan failed. Please try again.</span>
                </div>
            `;
            break;
    }
}

async function startEsp32Scan() {
    if (scanInProgress) {
        return;
    }
    
    scanInProgress = true;
    updateScanStatus('scanning');
    
    try {
        const response = await fetch('/api/doors/discover', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            discoveredEsp32s = data.devices || [];
            displayDiscoveredEsp32s();
            updateScanStatus('complete');
            
            // Show "Add All" button if devices were found
            if (discoveredEsp32s.length > 0) {
                document.getElementById('addAllBtn').style.display = 'inline-block';
            }
        } else {
            console.error('ESP32 discovery failed:', data);
            updateScanStatus('error');
        }
    } catch (error) {
        console.error('ESP32 discovery error:', error);
        updateScanStatus('error');
    } finally {
        scanInProgress = false;
    }
}

function displayDiscoveredEsp32s() {
    const container = document.getElementById('discoveredEsp32s');
    
    if (discoveredEsp32s.length === 0) {
        container.innerHTML = `
            <div class="no-esp32s">
                <i class="fas fa-wifi-slash"></i>
                <p>No ESP32 devices found on the network</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = discoveredEsp32s.map(esp32 => `
        <div class="esp32-card ${esp32.status}">
            <div class="esp32-header">
                <div class="esp32-name">${esp32.name || 'Unknown Device'}</div>
                <div class="esp32-status">
                    <span class="status-indicator ${esp32.status}"></span>
                    ${esp32.status}
                </div>
            </div>
            <div class="esp32-details">
                <div class="esp32-detail">
                    <span class="esp32-detail-label">MAC Address:</span>
                    <span class="esp32-detail-value">${esp32.mac}</span>
                </div>
                <div class="esp32-detail">
                    <span class="esp32-detail-label">IP Address:</span>
                    <span class="esp32-detail-value">${esp32.ip}</span>
                </div>
                <div class="esp32-detail">
                    <span class="esp32-detail-label">Signal Strength:</span>
                    <span class="esp32-detail-value">${esp32.signal ? `${esp32.signal} dBm` : 'N/A'}</span>
                </div>
                <div class="esp32-detail">
                    <span class="esp32-detail-label">Last Seen:</span>
                    <span class="esp32-detail-value">${new Date(esp32.lastSeen).toLocaleString()}</span>
                </div>
            </div>
            <div class="esp32-actions">
                <button class="btn btn-primary" onclick="configureEsp32('${esp32.mac}', '${esp32.ip}')" ${esp32.status === 'offline' ? 'disabled' : ''}>
                    <i class="fas fa-cog"></i> Configure
                </button>
                <button class="btn btn-secondary" onclick="testEsp32Connection('${esp32.mac}', '${esp32.ip}')" ${esp32.status === 'offline' ? 'disabled' : ''}>
                    <i class="fas fa-plug"></i> Test
                </button>
            </div>
        </div>
    `).join('');
}

async function configureEsp32(mac, ip) {
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
            
            const dropdown = document.getElementById('esp32ConfigAccessGroup');
            dropdown.innerHTML = '<option value="">Select an access group...</option>';
            
            accessGroups.forEach(group => {
                dropdown.innerHTML += `<option value="${group.id}">${group.name}</option>`;
            });
            
            // Populate the form
            document.getElementById('esp32ConfigMac').value = mac;
            document.getElementById('esp32ConfigIp').value = ip;
            document.getElementById('esp32ConfigName').value = `Door ${mac.split(':').pop()}`;
            document.getElementById('esp32ConfigLocation').value = 'Building A, Floor 1';
            
            // Show the modal
            document.getElementById('esp32ConfigModal').classList.add('active');
        }
    } catch (error) {
        console.error('Failed to load access groups:', error);
        showToast('Failed to load access groups', 'error');
    }
}

async function handleEsp32Config(event) {
    event.preventDefault();
    showLoading();
    
    const formData = new FormData(event.target);
    const doorData = {
        name: formData.get('name'),
        location: formData.get('location'),
        esp32Ip: formData.get('ip'),
        esp32Mac: formData.get('mac'),
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
            showToast('ESP32 configured as door successfully!', 'success');
            closeModal('esp32ConfigModal');
            
            // Remove the configured ESP32 from the discovered list
            discoveredEsp32s = discoveredEsp32s.filter(esp32 => esp32.mac !== doorData.esp32Mac);
            displayDiscoveredEsp32s();
            
            // Update the scan status
            if (discoveredEsp32s.length === 0) {
                updateScanStatus('complete');
                document.getElementById('addAllBtn').style.display = 'none';
            }
            
            // Refresh the doors page if it's currently active
            if (document.getElementById('doorsSection').classList.contains('active')) {
                loadDoors();
            }
        } else {
            showToast(data.message || 'Failed to configure ESP32 as door', 'error');
        }
    } catch (error) {
        console.error('Failed to configure ESP32:', error);
        showToast('Failed to configure ESP32 as door', 'error');
    } finally {
        hideLoading();
    }
}

async function testEsp32Connection(mac, ip) {
    showLoading();
    
    try {
        const response = await fetch(`http://${ip}/status`, {
            method: 'GET',
            timeout: 5000
        });
        
        if (response.ok) {
            const data = await response.json();
            showToast(`ESP32 connection test successful! Status: ${data.status}`, 'success');
        } else {
            showToast('ESP32 connection test failed - Device not responding', 'error');
        }
    } catch (error) {
        console.error('ESP32 connection test failed:', error);
        showToast('ESP32 connection test failed - Cannot reach device', 'error');
    } finally {
        hideLoading();
    }
}

async function addAllDiscoveredEsp32s() {
    if (discoveredEsp32s.length === 0) {
        showToast('No ESP32 devices to add', 'warning');
        return;
    }
    
    if (!confirm(`Add all ${discoveredEsp32s.length} discovered ESP32 devices as doors?`)) {
        return;
    }
    
    showLoading();
    
    try {
        // Get the first available access group
        const response = await fetch('/api/access-groups?limit=1', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load access groups');
        }
        
        const data = await response.json();
        const accessGroupId = data.accessGroups.length > 0 ? data.accessGroups[0].id : null;
        
        // Add all ESP32s as doors
        const promises = discoveredEsp32s.map((esp32, index) => {
            const doorData = {
                name: `Door ${esp32.mac.split(':').pop()}`,
                location: `Building A, Floor ${Math.floor(index / 10) + 1}`,
                esp32Ip: esp32.ip,
                esp32Mac: esp32.mac,
                accessGroupId: accessGroupId
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
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
        const failed = results.length - successful;
        
        if (successful > 0) {
            showToast(`Successfully added ${successful} ESP32 devices as doors${failed > 0 ? ` (${failed} failed)` : ''}`, 'success');
            
            // Clear the discovered list
            discoveredEsp32s = [];
            displayDiscoveredEsp32s();
            updateScanStatus('complete');
            document.getElementById('addAllBtn').style.display = 'none';
            
            // Refresh the doors page if it's currently active
            if (document.getElementById('doorsSection').classList.contains('active')) {
                loadDoors();
            }
        } else {
            showToast('Failed to add any ESP32 devices as doors', 'error');
        }
    } catch (error) {
        console.error('Failed to add all ESP32s:', error);
        showToast('Failed to add ESP32 devices as doors', 'error');
    } finally {
        hideLoading();
    }
}
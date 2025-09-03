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

// Show login form
function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('mainApp').style.display = 'none';
}

// Show authenticated UI
function showAuthenticatedUI() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    updateUserInfo();
}

// Update user info display
function updateUserInfo() {
    if (currentUser) {
        document.getElementById('userName').textContent = `${currentUser.firstName} ${currentUser.lastName}`;
        document.getElementById('userRole').textContent = currentUser.role;
    }
}

// Load dashboard
function loadDashboard() {
    showSection('dashboard');
    loadDashboardStats();
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        showLoading();
        const [usersResponse, doorsResponse, accessGroupsResponse] = await Promise.all([
            fetch('/api/users/stats/overview', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            }),
            fetch('/api/doors/stats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            }),
            fetch('/api/access-groups', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
        ]);

        if (usersResponse.ok && doorsResponse.ok && accessGroupsResponse.ok) {
            const [usersData, doorsData, accessGroupsData] = await Promise.all([
                usersResponse.json(),
                doorsResponse.json(),
                accessGroupsData.json()
            ]);

            // Update dashboard stats
            document.getElementById('totalUsers').textContent = usersData.stats.totalUsers || 0;
            document.getElementById('totalDoors').textContent = doorsData.stats.totalDoors || 0;
            document.getElementById('totalAccessGroups').textContent = accessGroupsData.accessGroups?.length || 0;
        }
    } catch (error) {
        console.error('Failed to load dashboard stats:', error);
    } finally {
        hideLoading();
    }
}

// Show section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    document.getElementById(sectionName).style.display = 'block';
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[onclick="showSection('${sectionName}')"]`).classList.add('active');
    
    // Load section data
    switch(sectionName) {
        case 'users':
            loadUsers();
            break;
        case 'doors':
            loadDoors();
            break;
        case 'access-groups':
            loadAccessGroups();
            break;
        case 'dashboard':
            loadDashboardStats();
            break;
    }
}

// Show loading
function showLoading() {
    document.getElementById('loading').style.display = 'block';
}

// Hide loading
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Open modal
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

// Logout
function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    showLogin();
}

// ==================== AUTHENTICATION ====================

// Authentication functions
async function handleLogin(event) {
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

// ==================== USER MANAGEMENT ====================

// Load users
async function loadUsers() {
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
            showToast('Failed to load users', 'error');
        }
    } catch (error) {
        console.error('Failed to load users:', error);
        showToast('Failed to load users', 'error');
    } finally {
        hideLoading();
    }
}

// Display users
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.firstName} ${user.lastName}</td>
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td><span class="status-indicator ${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit" onclick="editUser(${user.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteUser(${user.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Create user
function createUser() {
    openModal('createUserModal');
}

// Handle create user form submission
async function handleCreateUser(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const userData = {
        email: formData.get('email'),
        password: formData.get('password'),
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
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
            closeModal('createUserModal');
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

// Edit user
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
            openModal('editUserModal');
        } else {
            showToast('Failed to load user data', 'error');
        }
    } catch (error) {
        console.error('Failed to load user:', error);
        showToast('Failed to load user data', 'error');
    } finally {
        hideLoading();
    }
}

// Populate edit user form
function populateEditUserForm(user) {
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUserEmail').value = user.email;
    document.getElementById('editUserFirstName').value = user.firstName;
    document.getElementById('editUserLastName').value = user.lastName;
    document.getElementById('editUserRole').value = user.role;
}

// Handle edit user form submission
async function handleEditUser(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const userId = formData.get('id');
    const userData = {
        email: formData.get('email'),
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
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
            closeModal('editUserModal');
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

// Delete user
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

// Load access groups for user dropdown
async function loadAccessGroupsForUser() {
    try {
        const response = await fetch('/api/access-groups?limit=100', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.accessGroups && Array.isArray(data.accessGroups)) {
                const select = document.getElementById('createUserAccessGroup');
                select.innerHTML = '<option value="">Select Access Group (Optional)</option>' +
                    data.accessGroups.map(group => 
                        `<option value="${group.id}">${group.name}</option>`
                    ).join('');
            } else {
                console.error('Invalid access groups data structure:', data);
            }
        }
    } catch (error) {
        console.error('Failed to load access groups for user:', error);
    }
}

// ==================== DOOR MANAGEMENT ====================

// Load doors
async function loadDoors() {
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
            showToast('Failed to load doors', 'error');
        }
    } catch (error) {
        console.error('Failed to load doors:', error);
        showToast('Failed to load doors', 'error');
    } finally {
        hideLoading();
    }
}

// Display doors
function displayDoors(doors) {
    const tbody = document.getElementById('doorsTableBody');
    tbody.innerHTML = doors.map(door => `
        <tr>
            <td>${door.name}</td>
            <td>${door.location}</td>
            <td>${door.esp32Id || 'Not assigned'}</td>
            <td><span class="status-indicator ${door.isActive ? 'active' : 'inactive'}">${door.isActive ? 'Active' : 'Inactive'}</span></td>
            <td>${new Date(door.createdAt).toLocaleDateString()}</td>
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
    `).join('');
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
        esp32Id: formData.get('esp32Id'),
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
            populateEditDoorForm(data.door);
            loadAccessGroupsForDoor();
            openModal('editDoorModal');
        } else {
            showToast('Failed to load door data', 'error');
        }
    } catch (error) {
        console.error('Failed to load door:', error);
        showToast('Failed to load door data', 'error');
    } finally {
        hideLoading();
    }
}

// Populate edit door form
function populateEditDoorForm(door) {
    document.getElementById('editDoorId').value = door.id;
    document.getElementById('editDoorName').value = door.name;
    document.getElementById('editDoorLocation').value = door.location;
    document.getElementById('editDoorEsp32Id').value = door.esp32Id || '';
}

// Handle edit door form submission
async function handleEditDoor(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const doorId = formData.get('id');
    const doorData = {
        name: formData.get('name'),
        location: formData.get('location'),
        esp32Id: formData.get('esp32Id')
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

// Load access groups for door dropdown
async function loadAccessGroupsForDoor() {
    try {
        const response = await fetch('/api/access-groups?limit=100', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.accessGroups && Array.isArray(data.accessGroups)) {
                const select = document.getElementById('createDoorAccessGroup');
                select.innerHTML = '<option value="">Select Access Group (Optional)</option>' +
                    data.accessGroups.map(group => 
                        `<option value="${group.id}">${group.name}</option>`
                    ).join('');
            } else {
                console.error('Invalid access groups data structure:', data);
            }
        }
    } catch (error) {
        console.error('Failed to load access groups for door:', error);
    }
}

// ==================== ACCESS GROUP MANAGEMENT ====================

// Load access groups
async function loadAccessGroups() {
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
            <td><span class="status-indicator active">Active</span></td>
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

// ==================== CHANGE PASSWORD ====================

// Handle change password form submission
async function handleChangePassword(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const passwordData = {
        currentPassword: formData.get('currentPassword'),
        newPassword: formData.get('newPassword'),
        confirmPassword: formData.get('confirmPassword')
    };
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
        showToast('New passwords do not match', 'error');
        return;
    }
    
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
            closeModal('changePasswordModal');
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

// ==================== ACCESS GROUP DETAILS ====================

// Manage access group details (door management)
async function manageAccessGroupDetails(accessGroupId) {
    try {
        showLoading();
        const response = await fetch(`/api/access-groups/${accessGroupId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayAccessGroupDetails(data);
            openModal('accessGroupDetailsModal');
        } else {
            showToast('Failed to load access group details', 'error');
        }
    } catch (error) {
        console.error('Failed to load access group details:', error);
        showToast('Failed to load access group details', 'error');
    } finally {
        hideLoading();
    }
}

// Display access group details
function displayAccessGroupDetails(data) {
    const { accessGroup, doors, users } = data;
    
    // Update modal title
    document.querySelector('#accessGroupDetailsModal .modal-title').textContent = 
        `Manage ${accessGroup.name}`;
    
    // Display doors
    const doorsList = document.getElementById('accessGroupDoorsList');
    if (doors && doors.length > 0) {
        doorsList.innerHTML = doors.map(door => `
            <div class="door-item">
                <div class="door-info">
                    <h4>${door.name}</h4>
                    <p>${door.location}</p>
                    <span class="door-status ${door.isActive ? 'active' : 'inactive'}">
                        ${door.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <button class="action-btn remove" onclick="removeDoorFromAccessGroup(${accessGroup.id}, ${door.id})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    } else {
        doorsList.innerHTML = '<p class="no-items">No doors assigned to this access group.</p>';
    }
    
    // Display users
    const usersList = document.getElementById('accessGroupUsersList');
    if (users && users.length > 0) {
        usersList.innerHTML = users.map(user => `
            <div class="user-item">
                <div class="user-info">
                    <h4>${user.firstName} ${user.lastName}</h4>
                    <p>${user.email}</p>
                    <span class="user-role">${user.role}</span>
                </div>
                <button class="action-btn remove" onclick="removeUserFromAccessGroup(${accessGroup.id}, ${user.id})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    } else {
        usersList.innerHTML = '<p class="no-items">No users assigned to this access group.</p>';
    }
}

// Remove door from access group
async function removeDoorFromAccessGroup(accessGroupId, doorId) {
    if (!confirm('Are you sure you want to remove this door from the access group?')) {
        return;
    }
    
    try {
        showLoading();
        const response = await fetch(`/api/access-groups/${accessGroupId}/doors/${doorId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showToast('Door removed from access group successfully', 'success');
            manageAccessGroupDetails(accessGroupId); // Refresh the details
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to remove door from access group', 'error');
        }
    } catch (error) {
        console.error('Failed to remove door from access group:', error);
        showToast('Failed to remove door from access group', 'error');
    } finally {
        hideLoading();
    }
}

// Remove user from access group
async function removeUserFromAccessGroup(accessGroupId, userId) {
    if (!confirm('Are you sure you want to remove this user from the access group?')) {
        return;
    }
    
    try {
        showLoading();
        const response = await fetch(`/api/access-groups/${accessGroupId}/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showToast('User removed from access group successfully', 'success');
            manageAccessGroupDetails(accessGroupId); // Refresh the details
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to remove user from access group', 'error');
        }
    } catch (error) {
        console.error('Failed to remove user from access group:', error);
        showToast('Failed to remove user from access group', 'error');
    } finally {
        hideLoading();
    }
}

// ==================== INITIALIZATION ====================

// Load access groups for dropdowns when modals are opened
document.addEventListener('DOMContentLoaded', function() {
    // Load access groups for user creation
    document.getElementById('createUserModal').addEventListener('click', function() {
        if (this.classList.contains('active')) {
            loadAccessGroupsForUser();
        }
    });
    
    // Load access groups for door creation
    document.getElementById('createDoorModal').addEventListener('click', function() {
        if (this.classList.contains('active')) {
            loadAccessGroupsForDoor();
        }
    });
});
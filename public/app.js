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

// Show login interface
function showLogin() {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('mainApp').style.display = 'none';
}

// Show authenticated interface
function showAuthenticatedUI() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';
    document.getElementById('userName').textContent = `${currentUser.firstName} ${currentUser.lastName}`;
}

// Handle login
document.getElementById('loginForm').addEventListener('submit', async function(event) {
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
        showToast('Login failed', 'error');
    } finally {
        hideLoading();
    }
});

// Logout
function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    showLogin();
    showToast('Logged out successfully', 'success');
}

// Show section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName + 'Section').classList.add('active');
    
    // Update sidebar active state
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Load section data
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

// Load dashboard
async function loadDashboard() {
    try {
        const response = await fetch('/api/users/stats/overview', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            document.getElementById('totalUsers').textContent = data.totalUsers || 0;
            document.getElementById('totalDoors').textContent = data.totalDoors || 0;
            document.getElementById('totalAccessGroups').textContent = data.totalAccessGroups || 0;
            document.getElementById('activeUsers').textContent = data.activeUsers || 0;
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Load users
async function loadUsers(page = 1) {
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
            displayPagination('users', data.pagination);
            currentPage = page;
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Display users
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.firstName} ${user.lastName}</td>
            <td>${user.email}</td>
            <td><span class="role-badge role-${user.role}">${user.role}</span></td>
            <td><span class="status-badge status-active">Active</span></td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editUser(${user.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Search users
function searchUsers() {
    const searchTerm = document.getElementById('userSearchInput').value;
    currentFilters.search = searchTerm || undefined;
    loadUsers(1);
}

// Filter users
function filterUsers() {
    const roleFilter = document.getElementById('userRoleFilter').value;
    const statusFilter = document.getElementById('userStatusFilter').value;
    
    currentFilters.role = roleFilter || undefined;
    currentFilters.isActive = statusFilter || undefined;
    
    loadUsers(1);
}

// User CRUD functions

async function handleCreateUser(event) {
    event.preventDefault();
    showLoading();
    
    const formData = new FormData(event.target);
    const userData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: formData.get('role'),
        accessGroupId: formData.get('accessGroupId')
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

// Edit user
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
        console.error('Error loading user:', error);
        showToast('Failed to load user details', 'error');
    }
}

// Handle edit user
async function handleEditUser(event) {
    event.preventDefault();
    showLoading();
    
    const formData = new FormData(event.target);
    const userId = formData.get('id');
    const updateData = {
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
            body: JSON.stringify(updateData)
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

// Delete user
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) {
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

// Load doors
async function loadDoors(page = 1) {
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
            displayPagination('doors', data.pagination);
            currentPage = page;
        }
    } catch (error) {
        console.error('Error loading doors:', error);
    }
}

// Display doors
function displayDoors(doors) {
    const tbody = document.getElementById('doorsTableBody');
    tbody.innerHTML = '';
    
    doors.forEach(door => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${door.name}</td>
            <td>${door.location}</td>
            <td>${door.esp32Ip}</td>
            <td><span class="status-badge status-active">Active</span></td>
            <td>${door.lastSeen ? new Date(door.lastSeen).toLocaleString() : 'Never'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editDoor(${door.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteDoor(${door.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Search doors
function searchDoors() {
    const searchTerm = document.getElementById('doorSearchInput').value;
    currentFilters.search = searchTerm || undefined;
    loadDoors(1);
}

// Filter doors
function filterDoors() {
    const statusFilter = document.getElementById('doorStatusFilter').value;
    currentFilters.isActive = statusFilter;
    loadDoors(1);
}

function showCreateDoorModal() {
    document.getElementById('createDoorModal').classList.add('active');
    loadAccessGroupsForDoor();
}

function showCreateUserModal() {
    document.getElementById('createUserModal').classList.add('active');
    document.getElementById('createUserForm').reset();
    loadAccessGroupsForUser();
}

async function handleCreateDoor(event) {
    event.preventDefault();
    showLoading();
    
    const formData = new FormData(event.target);
    const doorData = {
        name: formData.get('name'),
        location: formData.get('location'),
        esp32Ip: formData.get('esp32Ip'),
        esp32Mac: formData.get('esp32Mac'),
        accessGroupId: formData.get('accessGroupId')
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
            closeModal('createDoorModal');
            loadDoors(currentPage);
            showToast('Door created successfully!', 'success');
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

// Edit door
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
            
            document.getElementById('editDoorModal').classList.add('active');
        } else {
            showToast('Failed to load door details', 'error');
        }
    } catch (error) {
        console.error('Edit door error:', error);
        showToast('Failed to load door details', 'error');
    }
}

// Handle edit door
async function handleEditDoor(event) {
    event.preventDefault();
    showLoading();
    
    const formData = new FormData(event.target);
    const doorId = formData.get('id');
    const doorData = {
        name: formData.get('name'),
        location: formData.get('location'),
        esp32Ip: formData.get('esp32Ip'),
        esp32Mac: formData.get('esp32Mac')
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
            loadDoors(currentPage);
            showToast('Door deleted successfully!', 'success');
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

// Load access groups
async function loadAccessGroups(page = 1) {
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
            displayPagination('accessGroups', data.pagination);
            currentPage = page;
        }
    } catch (error) {
        console.error('Error loading access groups:', error);
    }
}

// Display access groups
function displayAccessGroups(accessGroups) {
    const tbody = document.getElementById('accessGroupsTableBody');
    tbody.innerHTML = '';
    
    accessGroups.forEach(accessGroup => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${accessGroup.name}</td>
            <td>${accessGroup.description || '-'}</td>
            <td><span class="status-badge status-active">Active</span></td>
            <td>${new Date(accessGroup.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editAccessGroup(${accessGroup.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteAccessGroup(${accessGroup.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Search access groups
function searchAccessGroups() {
    const searchTerm = document.getElementById('accessGroupSearchInput').value;
    currentFilters.search = searchTerm || undefined;
    loadAccessGroups(1);
}

// Filter access groups
function filterAccessGroups() {
    const statusFilter = document.getElementById('accessGroupStatusFilter').value;
    currentFilters.isActive = statusFilter;
    loadAccessGroups(1);
}

// Show create access group modal
function showCreateAccessGroupModal() {
    document.getElementById('createAccessGroupModal').classList.add('active');
    document.getElementById('createAccessGroupForm').reset();
}

// Handle create access group
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
            closeModal('createAccessGroupModal');
            loadAccessGroups(currentPage);
            showToast('Access group created successfully!', 'success');
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

// Edit access group
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
        }
    } catch (error) {
        console.error('Error loading access group:', error);
        showToast('Failed to load access group details', 'error');
    }
}

// Handle edit access group
async function handleEditAccessGroup(event) {
    event.preventDefault();
    showLoading();
    
    const formData = new FormData(event.target);
    const accessGroupId = formData.get('id');
    const updateData = {
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
            body: JSON.stringify(updateData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('editAccessGroupModal');
            loadAccessGroups(currentPage);
            showToast('Access group updated successfully!', 'success');
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

// Delete access group
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
            loadAccessGroups(currentPage);
            showToast('Access group deleted successfully!', 'success');
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

// Update profile info
function updateProfileInfo() {
    if (currentUser) {
        document.getElementById('profileName').textContent = `${currentUser.firstName} ${currentUser.lastName}`;
        document.getElementById('profileEmail').textContent = currentUser.email;
        document.getElementById('profileRole').textContent = currentUser.role;
        document.getElementById('profileCreated').textContent = new Date(currentUser.createdAt).toLocaleDateString();
    }
}

// Show change password modal
function showChangePasswordModal() {
    document.getElementById('changePasswordModal').classList.add('active');
    document.getElementById('changePasswordForm').reset();
}

// Handle change password
async function handleChangePassword(event) {
    event.preventDefault();
    showLoading();
    
    const formData = new FormData(event.target);
    const passwordData = {
        currentPassword: formData.get('currentPassword'),
        newPassword: formData.get('newPassword'),
        confirmPassword: formData.get('confirmPassword')
    };
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
        showToast('New passwords do not match', 'error');
        hideLoading();
        return;
    }
    
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

// Display pagination
function displayPagination(type, pagination) {
    const container = document.getElementById(type + 'Pagination');
    if (!pagination || pagination.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<div class="pagination-controls">';
    
    if (pagination.hasPrev) {
        html += `<button class="btn btn-sm btn-secondary" onclick="load${type.charAt(0).toUpperCase() + type.slice(1)}(${pagination.page - 1})">Previous</button>`;
    }
    
    html += `<span class="pagination-info">Page ${pagination.page} of ${pagination.totalPages}</span>`;
    
    if (pagination.hasNext) {
        html += `<button class="btn btn-sm btn-secondary" onclick="load${type.charAt(0).toUpperCase() + type.slice(1)}(${pagination.page + 1})">Next</button>`;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Show loading
function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

// Hide loading
function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// Show toast
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.getElementById('toastContainer').appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.getElementById('toastContainer').removeChild(toast);
        }, 300);
    }, 3000);
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
            select.innerHTML = '<option value="">Select Access Group</option>';
            
            data.accessGroups.forEach(accessGroup => {
                const option = document.createElement('option');
                option.value = accessGroup.id;
                option.textContent = accessGroup.name;
                select.appendChild(option);
            });
        } else {
            console.error('Failed to load access groups:', response.status);
        }
    } catch (error) {
        console.error('Error loading access groups for door:', error);
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
            select.innerHTML = '<option value="">Select Access Group</option>';
            
            data.accessGroups.forEach(accessGroup => {
                const option = document.createElement('option');
                option.value = accessGroup.id;
                option.textContent = accessGroup.name;
                select.appendChild(option);
            });
        } else {
            console.error('Failed to load access groups:', response.status);
        }
    } catch (error) {
        console.error('Error loading access groups for user:', error);
    }
}
const API_URL = 'http://localhost:5000/api';
let votesChart = null;

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token || !user || user.role !== 'Admin') {
        window.location.href = 'index.html';
        return;
    }
}

// Load dashboard data and update chart
async function loadDashboard() {
    try {
        const response = await fetch(`${API_URL}/admin/dashboard`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Update dashboard stats
        document.getElementById('totalUsers').textContent = data.totalUsers;
        document.getElementById('totalAdmins').textContent = data.totalAdmins;
        document.getElementById('totalVotes').textContent = data.totalVotes;
        document.getElementById('totalCandidates').textContent = data.totalCandidates;
        document.getElementById('activeCandidates').textContent = data.activeCandidates;

        // Update chart
        updateChart(data.candidates);

        // Update candidates list
        const candidatesList = document.getElementById('candidatesList');
        candidatesList.innerHTML = '';

        data.candidates.forEach(candidate => {
            const card = document.createElement('div');
            card.className = 'candidate-card';
            card.innerHTML = `
                <div class="candidate-info">
                    ${candidate.picture ? `<img src="${candidate.picture}" alt="${candidate.name}" class="candidate-image" onerror="this.style.display='none'">` : ''}
                    <div class="candidate-details">
                        <h4>${candidate.name}</h4>
                        <p>Votes: ${candidate.voteCount}</p>
                        <p>Status: ${candidate.disqualified ? 'Disqualified' : 'Active'}</p>
                    </div>
                </div>
                <div class="admin-controls">
                    <button class="disqualify-button" onclick="disqualifyCandidate('${candidate.id}')">
                        ${candidate.disqualified ? 'Requalify' : 'Disqualify'}
                    </button>
                    <button class="remove-button" onclick="removeCandidate('${candidate.id}')">
                        Remove
                    </button>
                </div>
            `;
            candidatesList.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        alert('Error loading dashboard data');
    }
}

// Update the chart with candidate data
function updateChart(candidates) {
    const ctx = document.getElementById('votesChart').getContext('2d');

    if (votesChart) {
        votesChart.destroy();
    }

    votesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: candidates.map(c => c.name),
            datasets: [{
                label: 'Votes',
                data: candidates.map(c => c.voteCount),
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Disqualify a candidate
async function disqualifyCandidate(candidateId) {
    if (!confirm('Are you sure you want to change this candidate\'s qualification status?')) return;

    try {
        const response = await fetch(`${API_URL}/admin/disqualify-candidate/${candidateId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();
        if (response.ok) {
            alert(data.message);
            loadDashboard();
        } else {
            alert(data.message || 'Error changing candidate status');
        }
    } catch (error) {
        console.error('Error changing candidate status:', error);
        alert('Error changing candidate status');
    }
}

// Remove a candidate
async function removeCandidate(candidateId) {
    if (!confirm('Are you sure you want to remove this candidate? This action cannot be undone.')) return;

    try {
        const response = await fetch(`${API_URL}/admin/remove-candidate/${candidateId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();
        if (response.ok) {
            alert(data.message);
            loadDashboard();
        } else {
            alert(data.message || 'Error removing candidate');
        }
    } catch (error) {
        console.error('Error removing candidate:', error);
        alert('Error removing candidate');
    }
}

// Toggle add candidate form visibility
function toggleAddCandidateForm() {
    const form = document.getElementById('addCandidateForm');
    const button = document.getElementById('toggleAddCandidateBtn');

    if (form.style.display === 'none') {
        form.style.display = 'block';
        button.textContent = '- Cancel';
        button.classList.add('cancel-mode');
    } else {
        form.style.display = 'none';
        button.textContent = '+ Add New Candidate';
        button.classList.remove('cancel-mode');
        // Reset form
        document.getElementById('candidateForm').reset();
    }
}

// Cancel add candidate
function cancelAddCandidate() {
    toggleAddCandidateForm();
}

// Add new candidate
async function addCandidate(event) {
    event.preventDefault();

    const name = document.getElementById('candidateName').value.trim();
    const picture = document.getElementById('candidatePicture').value.trim();

    if (!name) {
        alert('Please enter a candidate name');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/add-candidate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                picture: picture || null
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            alert(data.message || 'Candidate added successfully!');
            toggleAddCandidateForm(); // Hide form
            loadDashboard(); // Reload dashboard
        } else {
            alert(data.message || 'Error adding candidate');
        }
    } catch (error) {
        console.error('Error adding candidate:', error);
        alert('Network error: Could not add candidate. Please check if the server is running.');
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Load admin profile info
function loadAdminProfile() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        document.getElementById('adminName').textContent = user.name || 'Administrator';
        document.getElementById('adminEmail').textContent = user.email || 'admin@voting.com';

        // Update profile picture if available
        if (user.profilePicture) {
            document.getElementById('adminProfilePicture').src = `http://localhost:5000${user.profilePicture}`;
        }
    }
}

// Initialize dashboard
checkAuth();
loadAdminProfile();
loadDashboard();

// Toggle users section visibility
function toggleUsersSection() {
    const usersSection = document.getElementById('usersSection');
    const toggleBtn = document.getElementById('toggleUsersBtn');

    if (usersSection.style.display === 'none') {
        usersSection.style.display = 'block';
        toggleBtn.textContent = '👥 Hide Voters List ';
        loadUsers(); // Load users when showing the section
    } else {
        usersSection.style.display = 'none';
        toggleBtn.textContent = '👥 Show Voters List';
    }
}

// Load all users
async function loadUsers() {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '<p>Loading users...</p>';

    try {
        const response = await fetch(`${API_URL}/admin/users`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            displayUsers(data.users);
        } else {
            usersList.innerHTML = '<p>Failed to load users</p>';
            alert('Failed to load users');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        usersList.innerHTML = '<p>Error loading users. Please try again.</p>';
        alert('Error loading users');
    }
}

// Display users in the UI
function displayUsers(users) {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';

    if (users.length === 0) {
        usersList.innerHTML = '<p>No users found.</p>';
        return;
    }

    users.forEach(user => {
        const userCard = document.createElement('div');
        userCard.className = 'user-card';

        const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        userCard.innerHTML = `
            <div class="user-info">
                ${user.profilePicture ?
                    `<img src="http://localhost:5000${user.profilePicture}" alt="${user.name}" class="user-avatar" onerror="this.style.display='none'">` :
                    `<div class="user-avatar" style="background: #e9ecef; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #6c757d;">${user.name.charAt(0).toUpperCase()}</div>`
                }
                <div class="user-details">
                    <h4>${user.name}</h4>
                    <p>📧 ${user.email}</p>
                    <p>📅 Joined: ${joinDate}</p>
                    <p>
                        <span class="user-status ${user.role.toLowerCase()}">${user.role}</span>
                        <span class="user-status ${user.hasVoted ? 'voted' : 'not-voted'}">${user.hasVoted ? 'Voted' : 'Not Voted'}</span>
                    </p>
                </div>
            </div>
            <div class="user-actions">
                <button class="edit-user-button" onclick="openEditUserModal('${user.id}', '${user.name}', '${user.email}')">
                    ✏️ Edit User
                </button>
                <button class="delete-user-button"
                        onclick="deleteUser('${user.id}', '${user.name}')"
                        ${user.role === 'Admin' ? 'disabled title="Cannot delete admin users"' : ''}>
                    ${user.role === 'Admin' ? '🔒 Protected' : '🗑️ Delete User'}
                </button>
            </div>
        `;

        usersList.appendChild(userCard);
    });
}

// Edit User Modal Functions
function openEditUserModal(userId, userName, userEmail) {
    document.getElementById('editUserId').value = userId;
    document.getElementById('editUserName').value = userName;
    document.getElementById('editUserEmail').value = userEmail;
    document.getElementById('editUserNewPassword').value = '';
    document.getElementById('editUserConfirmPassword').value = '';
    document.getElementById('editUserModal').style.display = 'flex';
}

function closeEditUserModal() {
    document.getElementById('editUserModal').style.display = 'none';
    document.getElementById('editUserForm').reset();
}

// Handle edit user form submission
async function handleEditUser(e) {
    e.preventDefault();

    const userId = document.getElementById('editUserId').value;
    const name = document.getElementById('editUserName').value.trim();
    const email = document.getElementById('editUserEmail').value.trim();
    const newPassword = document.getElementById('editUserNewPassword').value;
    const confirmPassword = document.getElementById('editUserConfirmPassword').value;

    // Validation
    if (!name || !email) {
        alert('Please fill in all required fields');
        return;
    }

    if (newPassword && newPassword !== confirmPassword) {
        alert('New passwords do not match');
        return;
    }

    if (newPassword && newPassword.length < 6) {
        alert('New password must be at least 6 characters long');
        return;
    }

    try {
        const updateData = {
            name: name,
            email: email
        };

        if (newPassword) {
            updateData.newPassword = newPassword;
        }

        const response = await fetch(`${API_URL}/admin/edit-user/${userId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            alert('User updated successfully!');
            closeEditUserModal();
            loadUsers(); // Reload users list
        } else {
            alert(data.message || 'Failed to update user');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        alert('Network error: Could not update user. Please check if the server is running.');
    }
}

// Delete a user
async function deleteUser(userId, userName) {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone and will also delete all their votes.`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/delete-user/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();

        if (response.ok && data.success) {
            alert(data.message);
            loadUsers(); // Reload users list
            loadDashboard(); // Reload dashboard to update stats
        } else {
            alert(data.message || 'Error deleting user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Network error: Could not delete user. Please check if the server is running.');
    }
}

// Toggle admins section visibility
function toggleAdminsSection() {
    const adminsSection = document.getElementById('adminsSection');
    const toggleBtn = document.getElementById('toggleAdminsBtn');

    if (adminsSection.style.display === 'none') {
        adminsSection.style.display = 'block';
        toggleBtn.textContent = '🔐 Hide Admin Users';
        loadAdmins(); // Load admins when showing the section
    } else {
        adminsSection.style.display = 'none';
        toggleBtn.textContent = '🔐 Show Admin Users';
    }
}

// Load all admin users
async function loadAdmins() {
    const adminsList = document.getElementById('adminsList');
    adminsList.innerHTML = '<p>Loading admin users...</p>';

    try {
        const response = await fetch(`${API_URL}/admin/admins`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            displayAdmins(data.admins);
        } else {
            adminsList.innerHTML = '<p>Failed to load admin users</p>';
            alert('Failed to load admin users');
        }
    } catch (error) {
        console.error('Error loading admin users:', error);
        adminsList.innerHTML = '<p>Error loading admin users. Please try again.</p>';
        alert('Error loading admin users');
    }
}

// Display admin users in the UI
function displayAdmins(admins) {
    const adminsList = document.getElementById('adminsList');
    adminsList.innerHTML = '';

    if (admins.length === 0) {
        adminsList.innerHTML = '<p>No admin users found.</p>';
        return;
    }

    admins.forEach(admin => {
        const adminCard = document.createElement('div');
        adminCard.className = 'admin-card';

        const joinDate = new Date(admin.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        adminCard.innerHTML = `
            <div class="user-info">
                ${admin.profilePicture ?
                    `<img src="http://localhost:5000${admin.profilePicture}" alt="${admin.name}" class="user-avatar" onerror="this.style.display='none'">` :
                    `<div class="user-avatar" style="background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-weight: bold; color: white;">${admin.name.charAt(0).toUpperCase()}</div>`
                }
                <div class="user-details">
                    <h4>${admin.name}</h4>
                    <p>📧 ${admin.email}</p>
                    <p>📅 Admin since: ${joinDate}</p>
                    <p>
                        <span class="user-status">${admin.hasVoted ? 'Has Voted' : 'Not Voted'}</span>
                    </p>
                </div>
            </div>
            <div class="admin-badge">
                🔐 SYSTEM ADMINISTRATOR
            </div>
        `;

        adminsList.appendChild(adminCard);
    });
}

// Modal functions for user registration
function openRegisterUserModal() {
    document.getElementById('registerUserModal').style.display = 'flex';
}

function closeRegisterUserModal() {
    document.getElementById('registerUserModal').style.display = 'none';
    document.getElementById('adminRegisterForm').reset();
}

// Register new user
async function registerNewUser(event) {
    event.preventDefault();

    const name = document.getElementById('newUserName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const role = document.getElementById('newUserRole').value;

    if (!name || !email || !password) {
        alert('Please fill in all required fields');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }

    const requestData = {
        name: name,
        email: email,
        password: password,
        role: role
    };

    console.log('Sending registration data:', requestData);

    try {
        const response = await fetch(`${API_URL}/admin/register-user`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            alert(data.message);
            closeRegisterUserModal(); // Hide modal
            loadDashboard(); // Reload dashboard to update stats

            // Reload user lists if they're visible
            const usersSection = document.getElementById('usersSection');
            const adminsSection = document.getElementById('adminsSection');

            if (usersSection.style.display !== 'none') {
                loadUsers();
            }
            if (adminsSection.style.display !== 'none') {
                loadAdmins();
            }
        } else {
            console.error('Registration failed:', data);
            if (data.errors && Array.isArray(data.errors)) {
                alert('Validation errors:\n' + data.errors.join('\n'));
            } else {
                alert(data.message || 'Error creating user');
            }
        }
    } catch (error) {
        console.error('Error creating user:', error);
        alert('Network error: Could not create user. Please check if the server is running.');
    }
}

// Logo click functionality
function refreshDashboard() {
    console.log('Refreshing dashboard...');

    // Add visual feedback
    const logoContainer = document.querySelector('.logo-container');
    if (logoContainer) {
        logoContainer.style.transform = 'scale(0.95)';
        setTimeout(() => {
            logoContainer.style.transform = '';
        }, 150);
    }

    // Refresh dashboard data
    loadDashboard();

    // Show notification
    showNotification('Dashboard refreshed!', 'success');
}

// Simple notification function
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#28a745' : '#007bff'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        font-size: 14px;
        font-weight: 500;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Profile Management Functions
function openEditProfileModal() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        document.getElementById('editAdminName').value = user.name || '';
        document.getElementById('editAdminEmail').value = user.email || '';
        document.getElementById('editAdminPassword').value = '';
        document.getElementById('editAdminConfirmPassword').value = '';
        document.getElementById('editAdminCurrentPassword').value = '';
    }
    document.getElementById('editProfileModal').style.display = 'flex';
}

function closeEditProfileModal() {
    document.getElementById('editProfileModal').style.display = 'none';
    document.getElementById('editProfileForm').reset();
}

function openDeleteAccountModal() {
    document.getElementById('deleteAccountModal').style.display = 'flex';
}

function closeDeleteAccountModal() {
    document.getElementById('deleteAccountModal').style.display = 'none';
    document.getElementById('deleteAccountForm').reset();
}

// Edit Profile Form Handler
async function handleEditProfile(e) {
    e.preventDefault();

    const name = document.getElementById('editAdminName').value.trim();
    const email = document.getElementById('editAdminEmail').value.trim();
    const newPassword = document.getElementById('editAdminPassword').value;
    const confirmPassword = document.getElementById('editAdminConfirmPassword').value;
    const currentPassword = document.getElementById('editAdminCurrentPassword').value;

    // Validation
    if (!name || !email || !currentPassword) {
        alert('Please fill in all required fields');
        return;
    }
    

    if (newPassword && newPassword !== confirmPassword) {
        alert('New passwords do not match');
        return;
    }

    if (newPassword && newPassword.length < 6) {
        alert('New password must be at least 6 characters long');
        return;
    }

    try {
        const updateData = {
            name: name,
            email: email,
            currentPassword: currentPassword
        };

        if (newPassword) {
            updateData.newPassword = newPassword;
        }

        const response = await fetch(`${API_URL}/admin/update-profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Update local storage
            const user = JSON.parse(localStorage.getItem('user'));
            user.name = name;
            user.email = email;
            localStorage.setItem('user', JSON.stringify(user));

            // Update UI
            document.getElementById('adminName').textContent = name;
            document.getElementById('adminEmail').textContent = email;

            showNotification('Profile updated successfully!', 'success');
            closeEditProfileModal();
        } else {
            alert(data.message || 'Failed to update profile');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Network error: Could not update profile. Please check if the server is running.');
    }
}

// Delete Account Form Handler
async function handleDeleteAccount(e) {
    e.preventDefault();

    const password = document.getElementById('deleteConfirmPassword').value;
    const confirmText = document.getElementById('deleteConfirmText').value;

    if (confirmText !== 'DELETE MY ACCOUNT') {
        alert('Please type "DELETE MY ACCOUNT" exactly to confirm');
        return;
    }

    if (!password) {
        alert('Please enter your current password');
        return;
    }

    // Final confirmation
    const finalConfirm = confirm(
        'This is your FINAL WARNING!\n\n' +
        'Are you absolutely sure you want to delete your admin account?\n' +
        'This action CANNOT be undone and you will lose all access immediately.\n\n' +
        'Click OK to proceed with deletion, or Cancel to abort.'
    );

    if (!finalConfirm) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/delete-account`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            alert('Your account has been successfully deleted. You will now be logged out.');

            // Clear all local storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // Redirect to login page
            window.location.href = 'index.html';
        } else {
            alert(data.message || 'Failed to delete account');
        }
    } catch (error) {
        console.error('Error deleting account:', error);
        alert('Network error: Could not delete account. Please check if the server is running.');
    }
}

// Close modals when clicking outside
window.onclick = function(event) {
    const editModal = document.getElementById('editProfileModal');
    const deleteModal = document.getElementById('deleteAccountModal');
    const registerModal = document.getElementById('registerUserModal');
    const editUserModal = document.getElementById('editUserModal');

    if (event.target === editModal) {
        closeEditProfileModal();
    }
    if (event.target === deleteModal) {
        closeDeleteAccountModal();
    }
    if (event.target === registerModal) {
        closeRegisterUserModal();
    }
    if (event.target === editUserModal) {
        closeEditUserModal();
    }
}

// Add event listeners
document.getElementById('candidateForm').addEventListener('submit', addCandidate);
document.getElementById('adminRegisterForm').addEventListener('submit', registerNewUser);
document.getElementById('editProfileForm').addEventListener('submit', handleEditProfile);
document.getElementById('deleteAccountForm').addEventListener('submit', handleDeleteAccount);
document.getElementById('editUserForm').addEventListener('submit', handleEditUser);

// Refresh data every 30 seconds
setInterval(loadDashboard, 30000);
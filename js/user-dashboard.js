const API_URL = 'http://localhost:5000/api';

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token || !user || user.role !== 'User') {
        window.location.href = 'index.html';
        return;
    }
}

// Load user profile info from localStorage initially
function loadUserProfile() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        document.getElementById('userName').textContent = user.name || 'User';
        document.getElementById('userEmail').textContent = user.email || 'user@example.com';

        // Update profile picture if available
        if (user.profilePicture) {
            document.getElementById('userProfilePicture').src = `http://localhost:5000${user.profilePicture}`;
        }
    }
}

// Load dashboard data
async function loadDashboard() {
    try {
        const response = await fetch(`${API_URL}/user/dashboard`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const dashboardData = await response.json();

        // Update user profile information
        document.getElementById('userName').textContent = dashboardData.userName;
        document.getElementById('userEmail').textContent = dashboardData.email;

        // Update profile picture if available
        if (dashboardData.profilePicture) {
            document.getElementById('userProfilePicture').src = `http://localhost:5000${dashboardData.profilePicture}`;
        }

        // Update user status
        const userStatusElement = document.getElementById('userStatus');
        if (dashboardData.hasVoted) {
            userStatusElement.textContent = '✅ Vote Cast Successfully';
            userStatusElement.style.color = '#28a745';
        } else {
            userStatusElement.textContent = '⏳ Ready to Vote';
            userStatusElement.style.color = '#007bff';
        }

        // Update stats section
        const votingStatusElement = document.getElementById('votingStatus');
        if (dashboardData.hasVoted) {
            votingStatusElement.textContent = 'Voted';
            votingStatusElement.style.color = '#28a745';
        } else {
            votingStatusElement.textContent = 'Not Voted';
            votingStatusElement.style.color = '#dc3545';
        }

        document.getElementById('totalCandidates').textContent = dashboardData.candidates.length;

        // Count active candidates (non-disqualified)
        const activeCandidatesCount = dashboardData.candidates.filter(c => !c.disqualified).length;
        document.getElementById('activeCandidates').textContent = activeCandidatesCount;

        // Format and display join date
        const joinDate = new Date(dashboardData.joinDate);
        document.getElementById('memberSince').textContent = joinDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short'
        });

        // Show voted candidate if user has voted
        if (dashboardData.hasVoted && dashboardData.userVote) {
            const votedSection = document.getElementById('votedCandidateSection');
            votedSection.style.display = 'block';
            document.getElementById('votedCandidateName').textContent = dashboardData.userVote.candidateName;

            // Format and display vote date
            const voteDate = new Date(dashboardData.userVote.timestamp);
            document.getElementById('votedCandidateDate').textContent = voteDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // Load candidates
        const candidatesList = document.getElementById('candidatesList');
        candidatesList.innerHTML = '';

        if (dashboardData.candidates.length === 0) {
            candidatesList.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No candidates available at the moment.</p>';
            return;
        }

        dashboardData.candidates.forEach(candidate => {
            const card = document.createElement('div');
            card.className = 'candidate-card';
            card.innerHTML = `
                <div class="candidate-info">
                    ${candidate.picture ? `<img src="${candidate.picture}" alt="${candidate.name}" class="candidate-image" onerror="this.style.display='none'">` : ''}
                    <div class="candidate-details">
                        <h4>${candidate.name}</h4>
                        <p>Vote Count: ${candidate.voteCount}</p>
                        <p>Status: ${candidate.disqualified ? 'Disqualified' : 'Active'}</p>
                    </div>
                </div>
                <button class="vote-button" onclick="voteForCandidate('${candidate.id}')"
                    ${dashboardData.hasVoted || candidate.disqualified ? 'disabled' : ''}>
                    ${dashboardData.hasVoted ? 'Already Voted' : candidate.disqualified ? 'Disqualified' : 'Vote'}
                </button>
            `;
            candidatesList.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        alert('Error loading dashboard data');
    }
}

// Vote for a candidate
async function voteForCandidate(candidateId) {
    try {
        const response = await fetch(`${API_URL}/user/vote`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ candidateId })
        });

        const data = await response.json();
        if (data.success) {
            alert('Vote recorded successfully!');
            loadDashboard(); // Reload dashboard to update UI
        } else {
            alert(data.message);
        }
    } catch (error) {
        alert('Error recording vote');
    }
}

// Handle profile picture upload
document.getElementById('profilePictureInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, or GIF)');
        return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
    }

    const formData = new FormData();
    formData.append('profilePicture', file);

    // Show loading state
    const profilePicture = document.getElementById('userProfilePicture');
    const originalSrc = profilePicture.src;
    profilePicture.style.opacity = '0.5';

    try {
        const response = await fetch(`${API_URL}/user/profile-picture`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        const data = await response.json();
        if (data.success) {
            profilePicture.src = `http://localhost:5000${data.profilePicture}`;
            profilePicture.style.opacity = '1';
            const user = JSON.parse(localStorage.getItem('user'));
            user.profilePicture = data.profilePicture;
            localStorage.setItem('user', JSON.stringify(user));
            alert(data.message);
        } else {
            profilePicture.style.opacity = '1';
            alert(data.message);
        }
    } catch (error) {
        profilePicture.src = originalSrc;
        profilePicture.style.opacity = '1';
        alert('Error uploading profile picture. Please check your connection.');
    }
});

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Logo click functionality
function refreshDashboard() {
    console.log('Refreshing user dashboard...');

    // Add visual feedback
    const logoContainer = document.querySelector('.logo-container');
    if (logoContainer) {
        logoContainer.style.transform = 'scale(0.95)';
        setTimeout(() => {
            logoContainer.style.transform = '';
        }, 150);
    }

    // Refresh dashboard data
    loadUserProfile();
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

// Initialize dashboard
checkAuth();
loadUserProfile();
loadDashboard();

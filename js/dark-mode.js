// Simple Dark Mode Implementation

// Apply saved theme immediately
(function() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();

// Simple dark mode toggle for all pages
function simpleDarkModeToggle() {
    console.log('Simple dark mode toggle clicked!');

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    // Apply theme
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // Update button
    const btn = document.getElementById('darkModeBtn');
    if (btn) {
        if (newTheme === 'dark') {
            btn.innerHTML = '🌙';
            btn.style.background = 'linear-gradient(135deg, #2c3e50, #34495e)';
        } else {
            btn.innerHTML = '☀️';
            btn.style.background = 'linear-gradient(135deg, #ffd700, #ff8c00)';
        }
    }

    // Math CAPTCHA doesn't need theme updates - it uses CSS variables

    console.log('Theme changed to:', newTheme);
}


// Initialize button state when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('darkModeBtn');
    if (btn) {
        const currentTheme = localStorage.getItem('theme') || 'light';
        if (currentTheme === 'dark') {
            btn.innerHTML = '🌙';
            btn.style.background = 'linear-gradient(135deg, #2c3e50, #34495e)';
        } else {
            btn.innerHTML = '☀️';
            btn.style.background = 'linear-gradient(135deg, #ffd700, #ff8c00)';
        }
        console.log('Dark mode button initialized with theme:', currentTheme);
    }
});

// Make function globally available
window.simpleDarkModeToggle = simpleDarkModeToggle;

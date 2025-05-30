const API_URL = 'http://localhost:5000/api';

// Check if user is already logged in
function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user.role === 'Admin') {
            window.location.href = 'admin-dashboard.html';
        } else {
            window.location.href = 'user-dashboard.html';
        }
    }
}

// Math CAPTCHA functions
let mathAnswer = 0;

function generateMathCaptcha() {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operations = ['+', '-', '*'];
    const operation = operations[Math.floor(Math.random() * operations.length)];

    let question, answer;
    switch(operation) {
        case '+':
            question = `${num1} + ${num2} =`;
            answer = num1 + num2;
            break;
        case '-':
            question = `${num1 + num2} - ${num2} =`;
            answer = num1;
            break;
        case '*':
            question = `${num1} × ${num2} =`;
            answer = num1 * num2;
            break;
    }

    // Update both old and new question elements for compatibility
    const questionElement = document.getElementById('math-question-inline') || document.getElementById('math-question');
    if (questionElement) {
        questionElement.textContent = question;
    }

    mathAnswer = answer;
    document.getElementById('captcha-answer').value = '';
    document.getElementById('captcha-error').style.display = 'none';
    console.log('Generated math CAPTCHA:', question, 'Answer:', answer);
}

function validateMathCaptcha() {
    const userAnswer = parseInt(document.getElementById('captcha-answer').value);
    const errorElement = document.getElementById('captcha-error');

    if (userAnswer === mathAnswer) {
        errorElement.style.display = 'none';
        console.log('Math CAPTCHA validated successfully');
        return true;
    } else {
        errorElement.style.display = 'block';
        generateMathCaptcha(); // Generate new question
        console.log('Math CAPTCHA failed, generated new question');
        return false;
    }
}

function resetMathCaptcha() {
    generateMathCaptcha();
}

// Make functions globally available
window.generateMathCaptcha = generateMathCaptcha;
window.validateMathCaptcha = validateMathCaptcha;

// Handle login form submission
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validate math CAPTCHA first
        if (!validateMathCaptcha()) {
            return;
        }

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;

        // Disable submit button to prevent double submission
        const submitButton = document.getElementById('submitButton');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Logging in...';

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password,
                    role
                })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                if (data.user.role === 'Admin') {
                    window.location.href = 'admin-dashboard.html';
                } else {
                    window.location.href = 'user-dashboard.html';
                }
            } else {
                alert(data.message);
                resetMathCaptcha(); // Reset math CAPTCHA on login failure
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('An error occurred during login. Please try again.');
            resetMathCaptcha(); // Reset math CAPTCHA on error
        } finally {
            // Re-enable submit button
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    });
}

// Handle signup form submission
if (document.getElementById('signupForm')) {
    document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password, role })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                if (data.user.role === 'Admin') {
                    window.location.href = 'admin-dashboard.html';
                } else {
                    window.location.href = 'user-dashboard.html';
                }
            } else {
                alert(data.message);
            }
        } catch (error) {
            alert('An error occurred during registration');
        }
    });
}

// Initialize math CAPTCHA when page loads
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('math-question-inline') || document.getElementById('math-question')) {
        generateMathCaptcha();
        console.log('Math CAPTCHA initialized');
    }
});

// Check authentication on page load
checkAuth();
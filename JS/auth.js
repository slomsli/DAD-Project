// Authentication and session management
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    checkAuthStatus();

    // Login form submission
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            login();
        });
    }

    // Registration form submission
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            register();
        });
    }

    // Toggle between login and registration forms
    const registerLink = document.getElementById('register-link');
    const loginLink = document.getElementById('login-link');

    if (registerLink) {
        registerLink.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelector('.form-container').style.display = 'none';
            document.getElementById('registration-form').style.display = 'block';
        });
    }

    if (loginLink) {
        loginLink.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('registration-form').style.display = 'none';
            document.querySelector('.form-container').style.display = 'block';
        });
    }

    // --- BEGIN NEW CODE for Role and Platform ---    
    const roleSelect = document.getElementById('reg-role');
    const platformGroup = document.getElementById('platform-group');
    const platformSelect = document.getElementById('reg-platform');

    if (roleSelect) {
        roleSelect.addEventListener('change', function() {
            if (this.value === 'runner') {
                platformGroup.style.display = 'block';
                platformSelect.required = true;
            } else {
                platformGroup.style.display = 'none';
                platformSelect.required = false;
                platformSelect.value = 'grab'; // Reset to default or clear
            }
        });
    }
    // --- END NEW CODE for Role and Platform ---
});

// Check authentication status
function checkAuthStatus() {
    // --- MODIFICATION: Only run redirect logic if on index.html ---
    if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/' && window.location.pathname !== '/restaurant-system/' && window.location.pathname !== '/restaurant-system/index.html') {
        // If not on index.html (or root that serves index.html), don't try to redirect from here.
        // Other pages (customer.html, staff.html, runner.html) have their own checkAuth.
        return;
    }
    // --- END MODIFICATION ---

    fetch('php/api.php?action=check_auth')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // User is logged in, redirect to appropriate dashboard
                redirectToDashboard(data.user.role);
            }
        })
        .catch(error => {
            console.error('Error checking auth status:', error);
        });
}

// Login function
function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    
    // Create form data
    const formData = new FormData();
    formData.append('action', 'login');
    formData.append('email', email);
    formData.append('password', password);
    
    // Send login request
    fetch('php/api.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Login successful, redirect to appropriate dashboard
            redirectToDashboard(data.user.role);
        } else {
            // Display error message
            errorDiv.textContent = data.message;
            errorDiv.style.display = 'block';
        }
    })
    .catch(error => {
        console.error('Error during login:', error);
        errorDiv.textContent = 'An error occurred. Please try again.';
        errorDiv.style.display = 'block';
    });
}

// Registration function
function register() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const phone = document.getElementById('reg-phone').value;
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    const errorDiv = document.getElementById('register-error');
    
    const role = document.getElementById('reg-role').value;
    let platform = null;
    if (role === 'runner') {
        platform = document.getElementById('reg-platform').value;
    }

    // --- DEBUGGING LINE ADDED BELOW ---
    console.log('Role selected in JS:', role);
    if (role === 'runner') {
        console.log('Platform selected in JS:', platform);
    }
    // --- END DEBUGGING LINE ---
    
    // Validate passwords match
    if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match';
        errorDiv.style.display = 'block';
        return;
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('action', 'register');
    formData.append('name', name);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('password', password);
    formData.append('role', role);
    if (platform) {
        formData.append('platform', platform);
    }
    
    // Send registration request
    fetch('php/api.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Registration successful, redirect to appropriate dashboard
            redirectToDashboard(data.user.role);
        } else {
            // Display error message
            errorDiv.textContent = data.message;
            errorDiv.style.display = 'block';
        }
    })
    .catch(error => {
        console.error('Error during registration:', error);
        errorDiv.textContent = 'An error occurred. Please try again.';
        errorDiv.style.display = 'block';
    });
}

// Redirect to appropriate dashboard based on user role
function redirectToDashboard(role) {
    switch (role) {
        case 'customer':
            window.location.href = 'customer.html';
            break;
        case 'staff':
            window.location.href = 'staff.html';
            break;
        case 'runner':
            window.location.href = 'runner.html';
            break;
        default:
            console.error('Unknown role:', role);
    }
}

// Logout function (used in other pages)
function logout() {
    const formData = new FormData();
    formData.append('action', 'logout');
    
    fetch('php/api.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Redirect to login page
            window.location.href = 'index.html';
        }
    })
    .catch(error => {
        console.error('Error during logout:', error);
    });
}

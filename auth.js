// auth.js - Complete Authentication handler with UI state management
let currentUser = null;

// Initialize authentication
async function initAuth() {
    try {
        // Check for existing session
        const { user } = await auth.getCurrentUser();
        if (user) {
            currentUser = user;
            userData.name = user.profile?.display_name || user.profile?.username || 'User';
            updateAuthUI(user);
            await loadUserData();
            updateUIForAuthenticatedUser();
        } else {
            showAuthSection();
            updateUIForUnauthenticatedUser();
        }
        
        // Listen for auth state changes
        auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                currentUser = session.user;
                const { user: fullUser } = await auth.getCurrentUser();
                if (fullUser) {
                    currentUser = fullUser;
                    userData.name = fullUser.profile?.display_name || fullUser.profile?.username || 'User';
                }
                updateAuthUI(currentUser);
                await loadUserData();
                hideAuthSection();
                updateUIForAuthenticatedUser();
                showPage('home');
            } else if (event === 'SIGNED_OUT') {
                currentUser = null;
                userData = {
                    name: 'Guest',
                    watchedFilms: [],
                    reviews: []
                };
                showAuthSection();
                updateUIForUnauthenticatedUser();
            }
        });
    } catch (error) {
        console.error('Auth initialization error:', error);
        showAuthSection();
        updateUIForUnauthenticatedUser();
    }
}

function updateUIForAuthenticatedUser() {
    // Hide auth required messages
    const authMessages = document.querySelectorAll('.auth-required-message');
    authMessages.forEach(msg => msg.style.display = 'none');
    
    // Show authenticated content
    const profileContent = document.getElementById('profileContent');
    if (profileContent) profileContent.style.display = 'block';
    
    const commentFormFields = document.getElementById('commentFormFields');
    if (commentFormFields) commentFormFields.style.display = 'block';
    
    // Show create buttons
    const createBtns = ['createForumBtn', 'createThreadBtn'];
    createBtns.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) btn.style.display = 'block';
    });
}

function updateUIForUnauthenticatedUser() {
    // Show auth required messages
    const authMessages = document.querySelectorAll('.auth-required-message');
    authMessages.forEach(msg => msg.style.display = 'block');
    
    // Hide authenticated content
    const profileContent = document.getElementById('profileContent');
    if (profileContent) profileContent.style.display = 'none';
    
    const commentFormFields = document.getElementById('commentFormFields');
    if (commentFormFields) commentFormFields.style.display = 'none';
    
    // Hide create buttons
    const createBtns = ['createForumBtn', 'createThreadBtn'];
    createBtns.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) btn.style.display = 'none';
    });
}

function showAuthSection() {
    document.getElementById('auth-section').innerHTML = `
        <button class="login-btn" onclick="showPage('auth')">Login / Sign Up</button>
    `;
}

function hideAuthSection() {
    // Auth section will be updated by updateAuthUI
}

function updateAuthUI(user) {
    const authSection = document.getElementById('auth-section');
    const displayName = user.profile?.display_name || user.profile?.username || 'User';
    
    authSection.innerHTML = `
        <div class="user-info">
            <span>Welcome, ${displayName}</span>
            <button class="login-btn" onclick="handleLogout()" style="margin-left: 1rem;">Logout</button>
        </div>
    `;
}

function showAuthForm(type) {
    document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.add('hidden'));
    
    if (type === 'login') {
        document.querySelector('[onclick="showAuthForm(\'login\')"]').classList.add('active');
        document.getElementById('loginForm').classList.remove('hidden');
    } else {
        document.querySelector('[onclick="showAuthForm(\'signup\')"]').classList.add('active');
        document.getElementById('signupForm').classList.remove('hidden');
    }
    
    hideAuthMessage();
}

function showAuthMessage(message, isError = false) {
    const messageEl = document.getElementById('authMessage');
    messageEl.textContent = message;
    messageEl.className = `auth-message ${isError ? 'error' : 'success'}`;
    messageEl.classList.remove('hidden');
}

function hideAuthMessage() {
    const messageEl = document.getElementById('authMessage');
    if (messageEl) {
        messageEl.classList.add('hidden');
    }
}

async function handleSignup() {
    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    
    if (!username || !email || !password) {
        showAuthMessage('Please fill in all fields', true);
        return;
    }
    
    if (password.length < 6) {
        showAuthMessage('Password must be at least 6 characters', true);
        return;
    }
    
    // Check if username is alphanumeric
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        showAuthMessage('Username can only contain letters, numbers, and underscores', true);
        return;
    }
    
    try {
        showAuthMessage('Creating account...');
        const { data, error } = await auth.signUp(email, password, username);
        
        if (error) {
            throw error;
        }
        
        if (data.user) {
            if (data.user.email_confirmed_at) {
                showAuthMessage('Account created successfully! You are now logged in.');
                // The auth state change will handle UI updates
            } else {
                showAuthMessage('Account created! Please check your email to confirm your account.');
            }
        }
    } catch (error) {
        console.error('Signup error:', error);
        let errorMessage = 'Failed to create account';
        
        if (error.message.includes('User already registered')) {
            errorMessage = 'An account with this email already exists';
        } else if (error.message.includes('Invalid email')) {
            errorMessage = 'Please enter a valid email address';
        } else if (error.message.includes('Password')) {
            errorMessage = 'Password must be at least 6 characters long';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showAuthMessage(errorMessage, true);
    }
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showAuthMessage('Please enter email and password', true);
        return;
    }
    
    try {
        showAuthMessage('Logging in...');
        const { data, error } = await auth.signIn(email, password);
        
        if (error) {
            throw error;
        }
        
        showAuthMessage('Login successful!');
        // The auth state change will handle UI updates and navigation
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Failed to login';
        
        if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email or password';
        } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Please confirm your email before logging in';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showAuthMessage(errorMessage, true);
    }
}

async function handleLogout() {
    try {
        showAuthMessage('Logging out...');
        await auth.signOut();
        showAuthMessage('Logged out successfully');
        
        // Reset UI immediately
        updateUIForUnauthenticatedUser();
        showPage('home');
        
        // Clear any cached data
        movieCache = {};
        
    } catch (error) {
        console.error('Logout error:', error);
        showAuthMessage('Failed to logout', true);
    }
}

// Enhanced form validation
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateUsername(username) {
    // Username should be 3-20 characters, alphanumeric plus underscore
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
}

function validatePassword(password) {
    // At least 6 characters
    return password.length >= 6;
}

// Enhanced error handling
function getErrorMessage(error) {
    const errorMap = {
        'User already registered': 'An account with this email already exists',
        'Invalid login credentials': 'Invalid email or password',
        'Email not confirmed': 'Please confirm your email before logging in',
        'Invalid email': 'Please enter a valid email address',
        'Password should be at least 6 characters': 'Password must be at least 6 characters long',
        'Signup requires a valid password': 'Password must be at least 6 characters long'
    };
    
    for (const [key, message] of Object.entries(errorMap)) {
        if (error.message && error.message.includes(key)) {
            return message;
        }
    }
    
    return error.message || 'An unexpected error occurred';
}

// Add keyboard event listeners for forms
document.addEventListener('DOMContentLoaded', function() {
    // Add enter key support for login form
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    
    if (loginEmail) {
        loginEmail.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    }
    
    if (loginPassword) {
        loginPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    }
    
    // Add enter key support for signup form
    const signupPassword = document.getElementById('signupPassword');
    if (signupPassword) {
        signupPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleSignup();
            }
        });
    }
});

// Add authentication styles
const authStyles = `
.auth-message {
    margin-top: 1rem;
    padding: 0.8rem;
    border-radius: 4px;
    text-align: center;
    font-size: 0.9rem;
}

.auth-message.success {
    background: rgba(0, 255, 0, 0.1);
    color: #4ade80;
    border: 1px solid rgba(74, 222, 128, 0.3);
}

.auth-message.error {
    background: rgba(255, 0, 0, 0.1);
    color: #f87171;
    border: 1px solid rgba(248, 113, 113, 0.3);
}

.auth-tabs {
    display: flex;
    margin-bottom: 2rem;
    border-bottom: 1px solid #404040;
}

.auth-tab {
    background: none;
    border: none;
    color: #999;
    padding: 1rem 2rem;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.3s;
}

.auth-tab:hover {
    color: #fff;
}

.auth-tab.active {
    color: #ff6b35;
    border-bottom-color: #ff6b35;
}

.auth-form h2 {
    text-align: center;
    margin-bottom: 2rem;
    color: #fff;
}

.auth-required-message {
    background: rgba(255, 107, 53, 0.1);
    border: 1px solid rgba(255, 107, 53, 0.3);
    border-radius: 8px;
    color: #ccc;
}

.auth-required-message h3 {
    color: #ff6b35;
}

.user-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
}

.user-info span {
    color: #ccc;
}

@media (max-width: 768px) {
    .auth-tabs {
        margin-bottom: 1rem;
    }
    
    .auth-tab {
        padding: 0.8rem 1rem;
        font-size: 0.9rem;
    }
    
    .auth-form h2 {
        font-size: 1.2rem;
        margin-bottom: 1.5rem;
    }
    
    .user-info {
        flex-direction: column;
        gap: 0.3rem;
        align-items: flex-end;
        font-size: 0.8rem;
    }
    
    .login-btn {
        padding: 0.3rem 0.8rem;
        font-size: 0.8rem;
    }
}
`;

// Add styles to head if not already added
if (!document.querySelector('#auth-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'auth-styles';
    styleSheet.textContent = authStyles;
    document.head.appendChild(styleSheet);
}
// auth.js - Enhanced Authentication handler with better error handling
let currentUser = null;

// Initialize authentication with better error handling
async function initAuth() {
    try {
        console.log('Starting auth initialization...');
        
        // Try to initialize Supabase with timeout
        try {
            await waitForSupabase(15000); // 15 second timeout
            console.log('Supabase ready for auth');
        } catch (error) {
            console.error('Supabase initialization failed, using fallback mode:', error);
            showAuthSection();
            updateUIForUnauthenticatedUser();
            return;
        }
        
        // Check for existing session
        try {
            const { user } = await auth.getCurrentUser();
            if (user) {
                currentUser = user;
                userData.name = user.profile?.display_name || user.profile?.username || 'User';
                updateAuthUI(user);
                await loadUserDataFromSupabase();
                updateUIForAuthenticatedUser();
            } else {
                showAuthSection();
                updateUIForUnauthenticatedUser();
            }
        } catch (error) {
            console.error('Failed to get current user:', error);
            showAuthSection();
            updateUIForUnauthenticatedUser();
        }
        
        // Listen for auth state changes
        try {
            auth.onAuthStateChange(async (event, session) => {
                console.log('Auth state changed:', event);
                
                if (event === 'SIGNED_IN' && session?.user) {
                    currentUser = session.user;
                    try {
                        const { user: fullUser } = await auth.getCurrentUser();
                        if (fullUser) {
                            currentUser = fullUser;
                            userData.name = fullUser.profile?.display_name || fullUser.profile?.username || 'User';
                        }
                    } catch (error) {
                        console.warn('Failed to get full user data:', error);
                    }
                    
                    updateAuthUI(currentUser);
                    await loadUserDataFromSupabase();
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
            console.error('Failed to set up auth state listener:', error);
        }
        
    } catch (error) {
        console.error('Auth initialization error:', error);
        showAuthSection();
        updateUIForUnauthenticatedUser();
    }
}

// Enhanced authentication handlers with better error messages
async function handleSignup() {
    const username = document.getElementById('signupUsername')?.value?.trim();
    const email = document.getElementById('signupEmail')?.value?.trim();
    const password = document.getElementById('signupPassword')?.value;
    
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
        
        // Check if Supabase is available
        if (!isSupabaseInitialized) {
            try {
                await waitForSupabase(10000);
            } catch (error) {
                throw new Error('Unable to connect to authentication service. Please try again later.');
            }
        }
        
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
        
        if (error.message.includes('Unable to connect')) {
            errorMessage = error.message;
        } else if (error.message.includes('User already registered')) {
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
    const email = document.getElementById('loginEmail')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value;
    
    if (!email || !password) {
        showAuthMessage('Please enter email and password', true);
        return;
    }
    
    try {
        showAuthMessage('Logging in...');
        
        // Check if Supabase is available
        if (!isSupabaseInitialized) {
            try {
                await waitForSupabase(10000);
            } catch (error) {
                throw new Error('Unable to connect to authentication service. Please try again later.');
            }
        }
        
        const { data, error } = await auth.signIn(email, password);
        
        if (error) {
            throw error;
        }
        
        showAuthMessage('Login successful!');
        // The auth state change will handle UI updates and navigation
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Failed to login';
        
        if (error.message.includes('Unable to connect')) {
            errorMessage = error.message;
        } else if (error.message.includes('Invalid login credentials')) {
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
        
        if (isSupabaseInitialized) {
            await auth.signOut();
        }
        
        // Reset state regardless of Supabase success
        currentUser = null;
        userData = {
            name: 'Guest',
            watchedFilms: [],
            reviews: []
        };
        
        showAuthMessage('Logged out successfully');
        updateUIForUnauthenticatedUser();
        showPage('home');
        
        // Clear any cached data
        if (typeof movieCache !== 'undefined') {
            movieCache = {};
        }
        
    } catch (error) {
        console.error('Logout error:', error);
        
        // Even if logout fails on server, clear local state
        currentUser = null;
        userData = {
            name: 'Guest',
            watchedFilms: [],
            reviews: []
        };
        updateUIForUnauthenticatedUser();
        showPage('home');
        
        showAuthMessage('Logged out (connection error)', true);
    }
}

// UI update functions remain the same
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
    const authSection = document.getElementById('auth-section');
    if (authSection) {
        authSection.innerHTML = `
            <button class="login-btn" onclick="showPage('auth')">Login / Sign Up</button>
        `;
    }
}

function hideAuthSection() {
    // Auth section will be updated by updateAuthUI
}

function updateAuthUI(user) {
    const authSection = document.getElementById('auth-section');
    if (!authSection) return;
    
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
        document.querySelector('[onclick="showAuthForm(\'login\')"]')?.classList.add('active');
        document.getElementById('loginForm')?.classList.remove('hidden');
    } else {
        document.querySelector('[onclick="showAuthForm(\'signup\')"]')?.classList.add('active');
        document.getElementById('signupForm')?.classList.remove('hidden');
    }
    
    hideAuthMessage();
}

function showAuthMessage(message, isError = false) {
    const messageEl = document.getElementById('authMessage');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = `auth-message ${isError ? 'error' : 'success'}`;
        messageEl.classList.remove('hidden');
    }
}

function hideAuthMessage() {
    const messageEl = document.getElementById('authMessage');
    if (messageEl) {
        messageEl.classList.add('hidden');
    }
}

// Enhanced form validation and keyboard support
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
}

function validatePassword(password) {
    return password && password.length >= 6;
}

// Add keyboard event listeners for forms
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
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
    }, 100);
});

// Load user data from Supabase with fallback
async function loadUserDataFromSupabase() {
    if (!currentUser || !isSupabaseInitialized) {
        userData = {
            name: 'Guest',
            watchedFilms: [],
            reviews: []
        };
        return;
    }
    
    try {
        // Load watched movies
        const { data: watchedMovies, error: watchedError } = await db.getUserWatchedMovies(currentUser.id);
        if (!watchedError && watchedMovies) {
            userData.watchedFilms = watchedMovies.map(item => ({
                id: item.movie_id,
                title: item.movies.title,
                year: item.movies.year,
                poster: item.movies.poster_url,
                watchedDate: item.watched_date
            }));
        }
        
        // Load reviews
        const { data: reviews, error: reviewsError } = await db.getUserReviews(currentUser.id);
        if (!reviewsError && reviews) {
            userData.reviews = reviews.map(review => ({
                movieId: review.movie_id,
                title: review.movies.title,
                year: review.movies.year,
                poster: review.movies.poster_url,
                rating: review.rating,
                text: review.review_text,
                date: review.created_at
            }));
        }
        
        updateProfileStats();
        
    } catch (error) {
        console.error('Error loading user data:', error);
        // Use local fallback data
        userData = {
            name: currentUser.profile?.display_name || currentUser.profile?.username || 'User',
            watchedFilms: [],
            reviews: []
        };
    }
}
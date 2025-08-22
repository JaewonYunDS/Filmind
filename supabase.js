// supabase.js - Fixed Supabase configuration with proper initialization

// Supabase configuration
const SUPABASE_URL = 'https://jlsmvnfwjovggpqueurh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsc212bmZ3am92Z2dwcXVldXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3ODAzNjgsImV4cCI6MjA3MTM1NjM2OH0.UNpD3tfnHj_I4Y1cjrRwT61XwdckETzWOl8h7B5XvoM';

// Initialize Supabase client
let supabaseClient = null;
let isSupabaseInitialized = false;
let initializationPromise = null;

// Initialize Supabase with better error handling
async function initializeSupabase() {
    // Return existing promise if already initializing
    if (initializationPromise) {
        return initializationPromise;
    }
    
    initializationPromise = (async () => {
        try {
            console.log('Initializing Supabase client...');
            
            // Wait for the Supabase library to be available
            let attempts = 0;
            const maxAttempts = 50;
            
            while (typeof supabase === 'undefined' && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (typeof supabase === 'undefined') {
                throw new Error('Supabase library failed to load after ' + maxAttempts + ' attempts');
            }
            
            console.log('Supabase library loaded, creating client...');
            
            const { createClient } = supabase;
            
            // Create the Supabase client with additional configuration
            supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: false
                }
            });
            
            console.log('Supabase client created, testing connection...');
            
            // Test the connection with a simple query
            try {
                const { data, error } = await supabaseClient.auth.getSession();
                if (error && error.message !== 'Invalid Refresh Token: Refresh Token Not Found') {
                    console.warn('Supabase session warning (non-critical):', error.message);
                }
                console.log('Supabase session test completed');
            } catch (testError) {
                console.warn('Session test failed (will continue):', testError);
            }
            
            isSupabaseInitialized = true;
            console.log('Supabase initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Supabase:', error);
            isSupabaseInitialized = false;
            initializationPromise = null; // Reset so we can try again
            throw error;
        }
    })();
    
    return initializationPromise;
}

// Wait for Supabase to be ready with better timeout handling
function waitForSupabase(timeoutMs = 15000) {
    return new Promise(async (resolve, reject) => {
        if (isSupabaseInitialized && supabaseClient) {
            resolve(true);
            return;
        }
        
        // Set up timeout
        const timeout = setTimeout(() => {
            reject(new Error(`Supabase initialization timeout after ${timeoutMs}ms`));
        }, timeoutMs);
        
        try {
            await initializeSupabase();
            clearTimeout(timeout);
            resolve(true);
        } catch (error) {
            clearTimeout(timeout);
            reject(error);
        }
    });
}

// Enhanced authentication service with better error handling
const authService = {
    // Sign up new user
        async signUp(email, password, username) {
        try {
            console.log('Starting signup process...');
            await waitForSupabase(10000);
            
            if (!supabaseClient) {
                throw new Error('Supabase client not initialized');
            }
            
            console.log('Attempting to sign up user:', email);
            
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username: username
                    }
                }
            });
            
            if (error) {
                console.error('Signup error from Supabase:', error);
                throw error;
            }
            
            console.log('Signup response:', JSON.stringify(data, null, 2));
            
            // Create profile if user was created
            if (data.user) {
                try {
                    console.log('Creating user profile for ID:', data.user.id);
                    const { error: profileError } = await supabaseClient
                        .from('profiles')
                        .insert({
                            id: data.user.id,
                            username: username,
                            display_name: username,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        });
                    
                    if (profileError) {
                        console.error('Profile creation error:', JSON.stringify(profileError, null, 2));
                        throw new Error(`Failed to create user profile: ${profileError.message}`);
                    }
                    console.log('Profile created successfully for user:', data.user.id);
                } catch (profileErr) {
                    console.error('Profile creation failed:', profileErr);
                    throw profileErr;
                }
            } else {
                console.warn('No user data returned from signup');
            }
            
            return { data, error: null };
        } catch (error) {
            console.error('Sign up error:', JSON.stringify(error, null, 2));
            return { data: null, error };
        }
    },

    // Sign in user
    async signIn(email, password) {
        try {
            console.log('Starting signin process...');
            await waitForSupabase(10000);
            
            if (!supabaseClient) {
                throw new Error('Supabase client not initialized');
            }
            
            console.log('Attempting to sign in user:', email);
            
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) {
                console.error('Signin error from Supabase:', error);
                throw error;
            }
            
            console.log('Signin successful:', data.user ? 'User logged in' : 'No user returned');
            return { data, error: null };
        } catch (error) {
            console.error('Sign in error:', error);
            return { data: null, error };
        }
    },

    // Sign out user
    async signOut() {
        try {
            console.log('Starting signout process...');
            
            if (!isSupabaseInitialized || !supabaseClient) {
                console.log('Supabase not initialized, performing local logout');
                return { error: null };
            }
            
            const { error } = await supabaseClient.auth.signOut();
            if (error) throw error;
            
            console.log('Signout successful');
            return { error: null };
        } catch (error) {
            console.error('Sign out error:', error);
            return { error };
        }
    },

    async ensureUserProfile() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();
        
        if (error || !profile) {
            console.log('Creating missing profile for user:', user.id);
            const username = user.user_metadata?.username || user.email.split('@')[0];
            const { error: insertError } = await supabaseClient
                .from('profiles')
                .insert({
                    id: user.id,
                    username: username,
                    display_name: username,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            if (insertError) {
                console.error('Profile creation error:', insertError);
                throw insertError;
            }
            console.log('Profile created successfully');
        }
    } catch (error) {
        console.error('Error ensuring user profile:', error);
        throw error;
    }
},

    // Get current user
    async getCurrentUser() {
        try {
            await waitForSupabase(5000);
            
            if (!supabaseClient) {
                return { user: null, error: new Error('Supabase client not initialized') };
            }
            
            const { data: { user }, error } = await supabaseClient.auth.getUser();
            if (error) throw error;
            
            if (user) {
                // Get profile data
                try {
                    const { data: profile, error: profileError } = await supabaseClient
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();
                    
                    if (profileError && !profileError.message.includes('No rows found')) {
                        console.warn('Profile fetch warning:', profileError.message);
                    }
                    
                    return { user: { ...user, profile: profile || null }, error: null };
                } catch (profileErr) {
                    console.warn('Profile fetch failed:', profileErr.message);
                    return { user: { ...user, profile: null }, error: null };
                }
            }
            
            return { user: null, error: null };
        } catch (error) {
            console.error('Get user error:', error);
            return { user: null, error };
        }
    },

    // Listen to auth changes
    onAuthStateChange(callback) {
        if (!isSupabaseInitialized || !supabaseClient) {
            console.warn('Supabase not initialized for auth state change listener');
            // Return a mock subscription that does nothing
            return { 
                data: { 
                    subscription: {
                        unsubscribe: () => {}
                    }
                }
            };
        }
        return supabaseClient.auth.onAuthStateChange(callback);
    }
};

// Enhanced database service with fallback handling
const dbService = {
    // Helper to check if Supabase is available
    async ensureSupabase() {
        if (!isSupabaseInitialized) {
            await waitForSupabase(5000);
        }
        if (!supabaseClient) {
            throw new Error('Database not available');
        }
    },

    // Forums
    async getForums() {
        try {
            await this.ensureSupabase();
            
            const { data, error } = await supabaseClient
                .from('forums')
                .select(`
                    *,
                    profiles!forums_created_by_fkey(username, display_name)
                `)
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Get forums error:', error);
            return { data: null, error };
        }
    },

    async createForum(title, description) {
        try {
            await this.ensureSupabase();
            await this.ensureUserProfile(); // Add this
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) throw new Error('Not authenticated');
            
            const { data, error } = await supabaseClient
                .from('forums')
                .insert({
                    title,
                    description,
                    created_by: user.id
                })
                .select()
                .single();
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Create forum error:', error);
            return { data: null, error };
        }
    },

    async getThreads(forumId) {
        try {
            await this.ensureSupabase();
            
            const { data, error } = await supabaseClient
                .from('threads')
                .select(`
                    *,
                    profiles!threads_author_id_fkey(username, display_name)
                `)
                .eq('forum_id', forumId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Get threads error:', error);
            return { data: null, error };
        }
    },

    async createThread(forumId, title, content) {
        try {
            await this.ensureSupabase();
            
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabaseClient
                .from('threads')
                .insert({
                    forum_id: forumId,
                    title,
                    content,
                    author_id: user.id
                })
                .select()
                .single();
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Create thread error:', error);
            return { data: null, error };
        }
    },

    async getThread(threadId) {
        try {
            await this.ensureSupabase();
            
            const { data, error } = await supabaseClient
                .from('threads')
                .select(`
                    *,
                    profiles!threads_author_id_fkey(username, display_name),
                    forums(id, title)
                `)
                .eq('id', threadId)
                .single();
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Get thread error:', error);
            return { data: null, error };
        }
    },

    async getComments(threadId) {
        try {
            await this.ensureSupabase();
            
            const { data, error } = await supabaseClient
                .from('comments')
                .select(`
                    *,
                    profiles!comments_author_id_fkey(username, display_name)
                `)
                .eq('thread_id', threadId)
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Get comments error:', error);
            return { data: null, error };
        }
    },

    async createComment(threadId, content, parentId = null) {
        try {
            await this.ensureSupabase();
            
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabaseClient
                .from('comments')
                .insert({
                    thread_id: threadId,
                    parent_id: parentId,
                    content,
                    author_id: user.id
                })
                .select()
                .single();
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Create comment error:', error);
            return { data: null, error };
        }
    },

    async vote(type, id, direction) {
        try {
            await this.ensureSupabase();
            
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Check if vote already exists
            const { data: existingVote } = await supabaseClient
                .from('votes')
                .select('*')
                .eq('user_id', user.id)
                .eq('votable_type', type)
                .eq('votable_id', id)
                .single();

            let result;
            if (existingVote) {
                if (existingVote.vote_type === direction) {
                    // Remove vote
                    result = await supabaseClient
                        .from('votes')
                        .delete()
                        .eq('id', existingVote.id);
                } else {
                    // Update vote
                    result = await supabaseClient
                        .from('votes')
                        .update({ vote_type: direction })
                        .eq('id', existingVote.id);
                }
            } else {
                // Create new vote
                result = await supabaseClient
                    .from('votes')
                    .insert({
                        user_id: user.id,
                        votable_type: type,
                        votable_id: id,
                        vote_type: direction
                    });
            }

            if (result.error) throw result.error;
            return { data: result.data, error: null };
        } catch (error) {
            console.error('Vote error:', error);
            return { data: null, error };
        }
    },

    async upsertMovie(movieData) {
        try {
            await this.ensureSupabase();
            
            const { data, error } = await supabaseClient
                .from('movies')
                .upsert({
                    id: movieData.id,
                    title: movieData.title,
                    year: movieData.year,
                    director: movieData.director,
                    genre: movieData.genre,
                    runtime: movieData.runtime,
                    rating: parseFloat(movieData.rating) || null,
                    poster_url: movieData.poster,
                    overview: movieData.overview,
                    tmdb_data: movieData
                }, { onConflict: 'id' });
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Upsert movie error:', error);
            return { data: null, error };
        }
    },

        async toggleWatchedMovie(movieId, movieData) {
        try {
            await this.ensureSupabase();
            await this.ensureUserProfile(); // Add this
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) throw new Error('Not authenticated');
            await this.upsertMovie(movieData);
            const { data: existing } = await supabaseClient
                .from('user_watched_movies')
                .select('*')
                .eq('user_id', user.id)
                .eq('movie_id', movieId)
                .single();
            let result;
            if (existing) {
                result = await supabaseClient
                    .from('user_watched_movies')
                    .delete()
                    .eq('id', existing.id);
            } else {
                result = await supabaseClient
                    .from('user_watched_movies')
                    .insert({
                        user_id: user.id,
                        movie_id: movieId
                    });
            }
            if (result.error) throw result.error;
            return { data: !existing, error: null };
        } catch (error) {
            console.error('Toggle watched movie error:', error);
            return { data: null, error };
        }
    },

        async saveReview(movieId, movieData, rating, reviewText) {
        try {
            await this.ensureSupabase();
            await this.ensureUserProfile(); // Add this
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) throw new Error('Not authenticated');
            await this.upsertMovie(movieData);
            const { data, error } = await supabaseClient
                .from('user_reviews')
                .upsert({
                    user_id: user.id,
                    movie_id: movieId,
                    rating: rating,
                    review_text: reviewText || ''
                }, { onConflict: 'user_id,movie_id' });
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Save review error:', error);
            return { data: null, error };
        }
    },

    async getUserWatchedMovies(userId) {
        try {
            await this.ensureSupabase();
            
            const { data, error } = await supabaseClient
                .from('user_watched_movies')
                .select(`
                    *,
                    movies(*)
                `)
                .eq('user_id', userId)
                .order('watched_date', { ascending: false });
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Get user watched movies error:', error);
            return { data: null, error };
        }
    },

    async getUserReviews(userId) {
        try {
            await this.ensureSupabase();
            
            const { data, error } = await supabaseClient
                .from('user_reviews')
                .select(`
                    *,
                    movies(*)
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Get user reviews error:', error);
            return { data: null, error };
        }
    },

    async getMovieUserData(movieId, userId) {
        try {
            await this.ensureSupabase();
            
            const [watchedResult, reviewResult] = await Promise.all([
                supabaseClient
                    .from('user_watched_movies')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('movie_id', movieId)
                    .single(),
                supabaseClient
                    .from('user_reviews')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('movie_id', movieId)
                    .single()
            ]);

            return {
                isWatched: !!watchedResult.data,
                review: reviewResult.data,
                error: null
            };
        } catch (error) {
            console.error('Get movie user data error:', error);
            return { isWatched: false, review: null, error };
        }
    }
};

// Export services globally
window.supabaseClient = null; // Will be set after initialization
window.auth = authService;
window.db = dbService;

// Export initialization function
window.initializeSupabase = initializeSupabase;
window.waitForSupabase = waitForSupabase;

// Auto-initialize when script loads
console.log('Supabase script loaded, scheduling initialization...');
setTimeout(() => {
    initializeSupabase().then(() => {
        console.log('Auto-initialization successful');
        window.supabaseClient = supabaseClient;
    }).catch(error => {
        console.error('Auto-initialization failed:', error);
    });
}, 100);
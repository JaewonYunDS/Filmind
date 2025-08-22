// supabase.js - Fixed Supabase configuration with proper initialization and added getThread method

// Supabase configuration
const SUPABASE_URL = 'https://jlsmvnfwjovggpqueurh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsc212bmZ3am92Z2dwcXVldXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3ODAzNjgsImV4cCI6MjA3MTM1NjM2OH0.UNpD3tfnHj_I4Y1cjrRwT61XwdckETzWOl8h7B5XvoM';

// Initialize Supabase client
let supabaseClient = null;
let isSupabaseInitialized = false;
let initializationPromise = null;

// Initialize Supabase with better error handling
async function initializeSupabase() {
    if (initializationPromise) {
        return initializationPromise;
    }
    
    initializationPromise = (async () => {
        try {
            console.log('Initializing Supabase client...');
            
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
            
            supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: false
                }
            });
            
            console.log('Supabase client created, testing connection...');
            
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
            initializationPromise = null;
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
            
            return { data, error: null };
        } catch (error) {
            console.error('Sign up error:', JSON.stringify(error, null, 2));
            return { data: null, error };
        }
    },

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

    async getCurrentUser() {
    try {
        console.log('Fetching current user...');
        await waitForSupabase(10000);
        
        if (!supabaseClient) {
            throw new Error('Supabase client not initialized');
        }
        
        // First, get the session (this doesn't throw if no session exists)
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        
        if (sessionError) {
            console.error('Get session error:', sessionError);
            throw sessionError;
        }
        
        if (!session) {
            console.log('No active session found');
            return { user: null };
        }
        
        // If session exists, get the full user
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        
        if (userError) {
            console.error('Get user error:', userError);
            throw userError;
        }
        
        if (!user) {
            console.log('Session exists but no user found');
            return { user: null };
        }
        
        // Fetch profile with fallback
        let profile = null;
        try {
            const { data: profileData, error: profileError } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            
            if (profileError) {
                console.warn('Profile fetch error:', profileError);
            } else {
                profile = profileData;
            }
        } catch (profileErr) {
            console.warn('Failed to fetch profile:', profileErr);
        }
        
        console.log('User fetched successfully');
        return { user: { ...user, profile } };
    } catch (error) {
        console.error('Get current user error:', error);
        return { user: null };
    }
},

    onAuthStateChange(callback) {
        try {
            if (!supabaseClient) {
                console.warn('Supabase client not initialized for auth state change');
                return () => {};
            }
            
            const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
                callback(event, session);
            });
            
            return () => subscription?.unsubscribe();
        } catch (error) {
            console.error('Auth state change subscription error:', error);
            return () => {};
        }
    }
};

// Database service with fixed method syntax and added getThread
const dbService = {
    async ensureSupabase() {
        if (isSupabaseInitialized && supabaseClient) {
            return true;
        }
        await initializeSupabase();
        return true;
    },

    // In supabase.js, inside dbService
async ensureUserProfile() {
    try {
        await this.ensureSupabase();
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        if (error) {
            if (error.name === 'AuthSessionMissingError') {
                console.log('No authenticated user found, proceeding without profile');
                return null; // Return null instead of throwing
            }
            console.error('Get current user error:', error);
            throw error;
        }
        if (!user) {
            console.log('No authenticated user found, proceeding without profile');
            return null;
        }

        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (profileError) {
            console.error('Get profile error:', profileError);
            throw profileError;
        }
        
        return profile;
    } catch (error) {
        console.error('Ensure user profile error:', error);
        throw error; // Rethrow unexpected errors
    }
},

    async getForums() {
        try {
            await this.ensureSupabase();
            const { data, error } = await supabaseClient
                .from('forums')
                .select(`
                    *,
                    profiles(display_name, username)
                `)
                .order('created_at', { ascending: false });
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
            await this.ensureUserProfile();
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabaseClient
                .from('forums')
                .insert({
                    title,
                    description: description || 'No description provided',
                    created_by: user.id,
                    created_at: new Date().toISOString()
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
                    profiles(display_name, username)
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

    async getThread(threadId) {
        try {
            await this.ensureSupabase();
            const { data, error } = await supabaseClient
                .from('threads')
                .select(`
                    *,
                    profiles(display_name, username)
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

    async createThread(forumId, title, content) {
    try {
        await this.ensureSupabase();
        await this.ensureUserProfile();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
        // Insert the new thread
        const { data, error } = await supabaseClient
            .from('threads')
            .insert({
                forum_id: forumId,
                title: title,
                content: content,
                author_id: user.id
            })
            .select()
            .single();
        if (error) throw error;

        // Fetch current forum to get thread_count
        const { data: forum, error: forumError } = await supabaseClient
            .from('forums')
            .select('thread_count')
            .eq('id', forumId)
            .single();
        if (forumError) throw forumError;

        // Update thread_count
        await supabaseClient
            .from('forums')
            .update({ thread_count: (forum.thread_count || 0) + 1 })
            .eq('id', forumId);

        return { data, error: null };
    } catch (error) {
        console.error('Create thread error:', error);
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
                    profiles(display_name, username)
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

    // In supabase.js, inside the dbService object, add this method:
async createComment(threadId, content, parentId = null) {
    try {
        await this.ensureSupabase();
        await this.ensureUserProfile();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabaseClient
            .from('comments')
            .insert({
                thread_id: threadId,
                parent_id: parentId,
                content: content,
                author_id: user.id
            })
            .select()
            .single();
        if (error) throw error;

        // Update thread comment count
        const { data: thread, error: threadError } = await supabaseClient
            .from('threads')
            .select('comment_count')
            .eq('id', threadId)
            .single();
        if (threadError) throw threadError;

        await supabaseClient
            .from('threads')
            .update({ comment_count: (thread.comment_count || 0) + 1 })
            .eq('id', threadId);

        return { data, error: null };
    } catch (error) {
        console.error('Create comment error:', error);
        return { data: null, error };
    }
},

async voteOnContent(type, id, direction) {
    try {
        await this.ensureSupabase();
        await this.ensureUserProfile();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const votableType = type === 'thread' ? 'thread' : 'comment';

        // Check for existing vote
        const { data: existingVote, error: voteError } = await supabaseClient
            .from('votes')
            .select('*')
            .eq('user_id', user.id)
            .eq('votable_type', votableType)
            .eq('votable_id', id)
            .maybeSingle();

        if (voteError) throw voteError;

        let voteDelta = 0;
        if (existingVote) {
            if (existingVote.vote_type === direction) {
                // Remove vote if same direction
                await supabaseClient
                    .from('votes')
                    .delete()
                    .eq('id', existingVote.id);
                voteDelta = existingVote.vote_type === 'up' ? -1 : 1;
            } else {
                // Remove existing vote and apply new one
                await supabaseClient
                    .from('votes')
                    .delete()
                    .eq('id', existingVote.id);
                await supabaseClient
                    .from('votes')
                    .insert({
                        user_id: user.id,
                        votable_type: votableType,
                        votable_id: id,
                        vote_type: direction
                    });
                voteDelta = (existingVote.vote_type === 'up' ? -1 : 1) + (direction === 'up' ? 1 : -1);
            }
        } else {
            // Create new vote
            await supabaseClient
                .from('votes')
                .insert({
                    user_id: user.id,
                    votable_type: votableType,
                    votable_id: id,
                    vote_type: direction
                });
            voteDelta = direction === 'up' ? 1 : -1;
        }

        return { success: true, voteDelta, error: null };
    } catch (error) {
        console.error('Vote error:', error);
        return { success: false, error };
    }
},

    async upsertMovie(movieData) {
        try {
            await this.ensureSupabase();
            console.log('Upserting movie ID:', movieData.id);
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
                    tmdb_data: movieData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });
            if (error) {
                console.error('Upsert movie error:', error);
                throw error;
            }
            console.log('Movie upsert successful');
            return { data, error: null };
        } catch (error) {
            console.error('Upsert movie failed:', error);
            return { data: null, error };
        }
    },

    async toggleWatchedMovie(movieId, movieData) {
        try {
            await this.ensureSupabase();
            await this.ensureUserProfile();
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
            await this.ensureUserProfile();
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
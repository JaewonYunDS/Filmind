// supabase.js - Supabase configuration and database service

// Supabase configuration
const SUPABASE_URL = 'https://jlsmvnfwjovggpqueurh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsc212bmZ3am92Z2dwcXVldXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3ODAzNjgsImV4cCI6MjA3MTM1NjM2OH0.UNpD3tfnHj_I4Y1cjrRwT61XwdckETzWOl8h7B5XvoM';

// Initialize Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Authentication helpers
const auth = {
    // Sign up new user
    async signUp(email, password, username) {
        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username: username
                    }
                }
            });
            
            if (error) throw error;
            
            // Create profile
            if (data.user) {
                await supabaseClient
                    .from('profiles')
                    .insert({
                        id: data.user.id,
                        username: username,
                        display_name: username
                    });
            }
            
            return { data, error: null };
        } catch (error) {
            console.error('Sign up error:', error);
            return { data: null, error };
        }
    },

    // Sign in user
    async signIn(email, password) {
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Sign in error:', error);
            return { data: null, error };
        }
    },

    // Sign out user
    async signOut() {
        try {
            const { error } = await supabaseClient.auth.signOut();
            if (error) throw error;
            return { error: null };
        } catch (error) {
            console.error('Sign out error:', error);
            return { error };
        }
    },

    // Get current user
    async getCurrentUser() {
        try {
            const { data: { user }, error } = await supabaseClient.auth.getUser();
            if (error) throw error;
            
            if (user) {
                // Get profile data
                const { data: profile, error: profileError } = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                
                if (profileError) throw profileError;
                return { user: { ...user, profile }, error: null };
            }
            
            return { user: null, error: null };
        } catch (error) {
            console.error('Get user error:', error);
            return { user: null, error };
        }
    },

    // Listen to auth changes
    onAuthStateChange(callback) {
        return supabaseClient.auth.onAuthStateChange(callback);
    }
};

// Database service
const db = {
    // Forums
    async getForums() {
        try {
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

    // Threads
    async getThreads(forumId) {
        try {
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
            const { data, error } = await supabaseClient
                .from('threads')
                .select(`
                    *,
                    profiles!threads_author_id_fkey(username, display_name),
                    forums(title)
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

    // Comments
    async getComments(threadId) {
        try {
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
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabaseClient
                .from('comments')
                .insert({
                    thread_id: threadId,
                    content,
                    parent_id: parentId,
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

    // Voting
    async vote(votableType, votableId, voteType) {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Check if user already voted
            const { data: existingVote } = await supabaseClient
                .from('votes')
                .select('*')
                .eq('user_id', user.id)
                .eq('votable_type', votableType)
                .eq('votable_id', votableId)
                .single();

            let result;
            if (existingVote) {
                if (existingVote.vote_type === voteType) {
                    // Remove vote if same type
                    result = await supabaseClient
                        .from('votes')
                        .delete()
                        .eq('id', existingVote.id);
                } else {
                    // Update vote if different type
                    result = await supabaseClient
                        .from('votes')
                        .update({ vote_type: voteType })
                        .eq('id', existingVote.id);
                }
            } else {
                // Create new vote
                result = await supabaseClient
                    .from('votes')
                    .insert({
                        user_id: user.id,
                        votable_type: votableType,
                        votable_id: votableId,
                        vote_type: voteType
                    });
            }

            if (result.error) throw result.error;
            return { data: result.data, error: null };
        } catch (error) {
            console.error('Vote error:', error);
            return { data: null, error };
        }
    },

    async getUserVotes(userId) {
        try {
            const { data, error } = await supabaseClient
                .from('votes')
                .select('*')
                .eq('user_id', userId);
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Get user votes error:', error);
            return { data: null, error };
        }
    },

    // Movies
    async upsertMovie(movieData) {
        try {
            const { data, error } = await supabaseClient
                .from('movies')
                .upsert({
                    id: movieData.id,
                    title: movieData.title,
                    year: movieData.year,
                    director: movieData.director,
                    genre: movieData.genre,
                    runtime: movieData.runtime,
                    rating: movieData.rating,
                    poster_url: movieData.poster,
                    overview: movieData.overview,
                    tmdb_data: movieData
                })
                .select()
                .single();
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Upsert movie error:', error);
            return { data: null, error };
        }
    },

    // User movie interactions
    async toggleWatchedMovie(movieId, movieData) {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // First ensure movie exists
            await this.upsertMovie(movieData);

            // Check if already watched
            const { data: existing } = await supabaseClient
                .from('user_watched_movies')
                .select('*')
                .eq('user_id', user.id)
                .eq('movie_id', movieId)
                .single();

            let result;
            if (existing) {
                // Remove from watched
                result = await supabaseClient
                    .from('user_watched_movies')
                    .delete()
                    .eq('id', existing.id);
            } else {
                // Add to watched
                result = await supabaseClient
                    .from('user_watched_movies')
                    .insert({
                        user_id: user.id,
                        movie_id: movieId
                    });
            }

            if (result.error) throw result.error;
            return { data: !existing, error: null }; // Return true if added, false if removed
        } catch (error) {
            console.error('Toggle watched movie error:', error);
            return { data: null, error };
        }
    },

    async saveReview(movieId, movieData, rating, reviewText) {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // First ensure movie exists
            await this.upsertMovie(movieData);

            const { data, error } = await supabaseClient
                .from('user_reviews')
                .upsert({
                    user_id: user.id,
                    movie_id: movieId,
                    rating,
                    review_text: reviewText
                })
                .select()
                .single();
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Save review error:', error);
            return { data: null, error };
        }
    },

    async getUserWatchedMovies(userId) {
        try {
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

// Export for use in other files
window.supabaseClient = supabaseClient;
window.auth = auth;
window.db = db;
// main.js - Enhanced main application with proper initialization sequence
let currentForumId = null;
let currentThreadId = null;

async function init() {
    console.log('Starting application initialization...');
    
    try {
        // Initialize authentication first (this will handle Supabase init internally)
        console.log('Initializing authentication...');
        await initAuth();
        
        // Setup search and other components
        console.log('Setting up search...');
        setupSearch();
        
        // Load forum data (will fall back to local if Supabase fails)
        console.log('Loading forum data...');
        await loadForumDataSafely();
        
        // Update sidebar content
        console.log('Updating sidebar...');
        updateSidebarContent();
        
        console.log('Application initialization complete');
        
    } catch (error) {
        console.error('Application initialization error:', error);
        // Continue with local functionality even if there are errors
        setupSearch();
        updateSidebarContent();
    }
}

// Safe forum data loading with fallback
async function loadForumDataSafely() {
    try {
        if (isSupabaseInitialized && currentUser) {
            await loadForumDataFromSupabase();
        } else {
            console.log('Using local forum data (Supabase not available or user not authenticated)');
            initializeSampleForums();
            updateForumsList();
        }
    } catch (error) {
        console.error('Error loading forum data, falling back to samples:', error);
        initializeSampleForums();
        updateForumsList();
    }
}

async function loadForumDataFromSupabase() {
    try {
        // Load forums
        const { data: forums, error: forumsError } = await db.getForums();
        if (!forumsError && forums) {
            forumData.forums = forums.map(forum => ({
                id: forum.id,
                title: forum.title,
                description: forum.description,
                createdBy: forum.profiles?.display_name || forum.profiles?.username || 'Unknown',
                createdAt: forum.created_at,
                threadCount: forum.thread_count,
                postCount: forum.post_count
            }));
        }
        
        // If no forums exist, create sample forums
        if (forumData.forums.length === 0 && currentUser) {
            await createSampleForums();
        }
        
        // Load threads and comments for popular content
        await loadPopularContent();
        
    } catch (error) {
        console.error('Error loading forum data:', error);
        // Fall back to sample data if there's an error
        initializeSampleForums();
    }
    
    updateForumsList();
}

async function createSampleForums() {
    const sampleForums = [
        {
            title: "General Discussion",
            description: "General movie discussions and recommendations"
        },
        {
            title: "New Releases",
            description: "Discuss the latest movies hitting theaters"
        },
        {
            title: "Classic Cinema",
            description: "Celebrating timeless films and directors"
        }
    ];
    
    try {
        for (const forum of sampleForums) {
            const { data, error } = await db.createForum(forum.title, forum.description);
            if (!error && data) {
                forumData.forums.push({
                    id: data.id,
                    title: data.title,
                    description: data.description,
                    createdBy: currentUser.profile?.display_name || currentUser.profile?.username || 'User',
                    createdAt: data.created_at,
                    threadCount: 0,
                    postCount: 0
                });
            }
        }
    } catch (error) {
        console.error('Error creating sample forums:', error);
        // Fall back to local samples
        initializeSampleForums();
    }
}

async function loadPopularContent() {
    try {
        // Load threads for popular content sidebar
        const allThreads = [];
        for (const forum of forumData.forums) {
            const { data: threads, error } = await db.getThreads(forum.id);
            if (!error && threads) {
                allThreads.push(...threads.map(thread => ({
                    id: thread.id,
                    forumId: thread.forum_id,
                    title: thread.title,
                    content: thread.content,
                    author: thread.profiles?.display_name || thread.profiles?.username || 'Unknown',
                    createdAt: thread.created_at,
                    votes: thread.votes,
                    commentCount: thread.comment_count
                })));
            }
        }
        
        forumData.threads = allThreads;
        
    } catch (error) {
        console.error('Error loading popular content:', error);
    }
}

function updateSidebarContent() {
    updatePopularThreads();
    updateRecentDiscussion();
}

function updatePopularThreads() {
    const popularThreadsEl = document.getElementById('popularThreads');
    if (!popularThreadsEl) return;
    
    const topThreads = forumData.threads
        .sort((a, b) => (b.votes || 0) - (a.votes || 0))
        .slice(0, 5);
    
    if (topThreads.length === 0) {
        popularThreadsEl.innerHTML = '<div class="list-item"><div class="item-title">No threads yet</div></div>';
        return;
    }
    
    const html = topThreads.map(thread => `
        <div class="list-item" onclick="openThreadFromSidebar(${thread.id})">
            <div class="item-title">${thread.title}</div>
            <div class="item-count">${thread.votes || 0}</div>
        </div>
    `).join('');
    
    popularThreadsEl.innerHTML = html;
}

function updateRecentDiscussion() {
    const recentDiscussionEl = document.getElementById('recentDiscussion');
    if (!recentDiscussionEl) return;
    
    const recentThreads = forumData.threads
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
    
    if (recentThreads.length === 0) {
        recentDiscussionEl.innerHTML = '<div class="list-item"><div class="item-title">No recent discussions</div></div>';
        return;
    }
    
    const html = recentThreads.map(thread => `
        <div class="list-item" onclick="openThreadFromSidebar(${thread.id})">
            <div class="item-title">${thread.title}</div>
            <div class="item-count">${timeAgo(thread.createdAt)}</div>
        </div>
    `).join('');
    
    recentDiscussionEl.innerHTML = html;
}

// Enhanced forum functions with better error handling
async function createForum() {
    const title = document.getElementById('forumTitle').value.trim();
    const description = document.getElementById('forumDescription').value.trim();
    if (!title) {
        alert('Please enter a forum title');
        return;
    }
    try {
        console.log('Creating forum with Supabase, user:', currentUser);
        if (isSupabaseInitialized && currentUser) {
            const { data, error } = await db.createForum(title, description);
            if (error) {
                console.error('Supabase forum creation error:', error);
                throw new Error(error.message.includes('profiles') ? 'User profile not found. Please try logging out and back in.' : error.message);
            }
            forumData.forums.push({
                id: data.id,
                title: data.title,
                description: data.description,
                createdBy: userData.name,
                createdAt: data.created_at,
                threadCount: 0,
                postCount: 0
            });
        } else {
            console.log('Using local fallback for forum creation');
            await createForumLocal();
        }
        updateForumsList();
        hideCreateForumForm();
    } catch (error) {
        console.error('Forum creation error:', error);
        alert(`Failed to create forum: ${error.message}`);
    }
}

async function createThread() {
    if (!currentUser) {
        showAuthMessage('Please login to create a thread', true);
        showPage('auth');
        return;
    }
    
    const title = document.getElementById('threadTitle')?.value?.trim();
    const content = document.getElementById('threadContent')?.value?.trim();

    if (!title || !content) {
        alert('Please enter both title and content');
        return;
    }

    try {
        if (isSupabaseInitialized) {
            const { data, error } = await db.createThread(currentForumId, title, content);
            if (error) throw error;
            
            const newThread = {
                id: data.id,
                forumId: data.forum_id,
                title: data.title,
                content: data.content,
                author: currentUser.profile?.display_name || currentUser.profile?.username || 'User',
                createdAt: data.created_at,
                votes: 0,
                commentCount: 0
            };

            forumData.threads.push(newThread);
            
            // Update forum thread count
            const forum = forumData.forums.find(f => f.id === currentForumId);
            if (forum) forum.threadCount++;
        } else {
            // Use local fallback
            createThreadLocal();
            return;
        }
        
        updateThreadsList(currentForumId);
        hideCreateThreadForm();
        updateSidebarContent();
        
    } catch (error) {
        console.error('Error creating thread:', error);
        alert('Failed to create thread. Please try again.');
    }
}

async function addComment() {
    if (!currentUser) {
        showAuthMessage('Please login to comment', true);
        showPage('auth');
        return;
    }
    
    const content = document.getElementById('newCommentText')?.value?.trim();
    
    if (!content) {
        alert('Please enter a comment');
        return;
    }

    try {
        if (isSupabaseInitialized) {
            const { data, error } = await db.createComment(currentThreadId, content);
            if (error) throw error;
            
            const newComment = {
                id: data.id,
                threadId: data.thread_id,
                parentId: data.parent_id,
                content: data.content,
                author: currentUser.profile?.display_name || currentUser.profile?.username || 'User',
                createdAt: data.created_at,
                votes: 0
            };

            forumData.comments.push(newComment);
            
            // Update thread comment count
            const thread = forumData.threads.find(t => t.id === currentThreadId);
            if (thread) thread.commentCount++;
        } else {
            // Use local fallback
            addCommentLocal();
            return;
        }
        
        updateCommentsList(currentThreadId);
        document.getElementById('newCommentText').value = '';
        
    } catch (error) {
        console.error('Error adding comment:', error);
        alert('Failed to add comment. Please try again.');
    }
}

async function addReply(parentId) {
    if (!currentUser) {
        showAuthMessage('Please login to reply', true);
        showPage('auth');
        return;
    }
    
    const content = document.getElementById(`replyText-${parentId}`)?.value?.trim();
    
    if (!content) {
        alert('Please enter a reply');
        return;
    }

    try {
        if (isSupabaseInitialized) {
            const { data, error } = await db.createComment(currentThreadId, content, parentId);
            if (error) throw error;
            
            const newComment = {
                id: data.id,
                threadId: data.thread_id,
                parentId: data.parent_id,
                content: data.content,
                author: currentUser.profile?.display_name || currentUser.profile?.username || 'User',
                createdAt: data.created_at,
                votes: 0
            };

            forumData.comments.push(newComment);
            
            // Update thread comment count
            const thread = forumData.threads.find(t => t.id === currentThreadId);
            if (thread) thread.commentCount++;
        } else {
            // Use local fallback
            addReplyLocal(parentId);
            return;
        }
        
        updateCommentsList(currentThreadId);
        hideReplyForm(parentId);
        
    } catch (error) {
        console.error('Error adding reply:', error);
        alert('Failed to add reply. Please try again.');
    }
}

async function vote(type, id, direction, event) {
    if (!currentUser) {
        showAuthMessage('Please login to vote', true);
        showPage('auth');
        return;
    }
    
    if (event) {
        event.stopPropagation();
    }
    
    try {
        if (isSupabaseInitialized) {
            const { error } = await db.vote(type, id, direction);
            if (error) throw error;
            
            // Refresh the current view to show updated votes
            await refreshCurrentView();
        } else {
            // Use local fallback
            voteLocal(type, id, direction, event);
        }
        
    } catch (error) {
        console.error('Error voting:', error);
        alert('Failed to vote. Please try again.');
    }
}

async function refreshCurrentView() {
    try {
        // Reload forum data to get updated vote counts
        await loadForumDataFromSupabase();
        
        // Refresh the appropriate view
        if (document.getElementById('thread-detail-page')?.classList.contains('active')) {
            const thread = forumData.threads.find(t => t.id === currentThreadId);
            if (thread) {
                updateThreadDetail(thread);
                await loadAndDisplayComments(currentThreadId);
            }
        } else if (document.getElementById('forum-threads-page')?.classList.contains('active')) {
            updateThreadsList(currentForumId);
        }
        
        updateSidebarContent();
    } catch (error) {
        console.error('Error refreshing view:', error);
    }
}

// Navigation and thread management functions
async function showForumThreads(forumId) {
    currentForumId = forumId;
    const forum = forumData.forums.find(f => f.id === forumId);
    
    if (!forum) return;

    document.getElementById('currentForumName').textContent = forum.title;
    document.getElementById('forumBreadcrumbLink').textContent = forum.title;
    
    await loadThreadsForForum(forumId);
    showPage('forum-threads');
}

async function loadThreadsForForum(forumId) {
    try {
        if (isSupabaseInitialized) {
            const { data: threads, error } = await db.getThreads(forumId);
            if (error) throw error;
            
            const threadsForForum = threads.map(thread => ({
                id: thread.id,
                forumId: thread.forum_id,
                title: thread.title,
                content: thread.content,
                author: thread.profiles?.display_name || thread.profiles?.username || 'Unknown',
                createdAt: thread.created_at,
                votes: thread.votes || 0,
                commentCount: thread.comment_count || 0
            }));
            
            // Update forumData threads for this forum
            forumData.threads = forumData.threads.filter(t => t.forumId !== forumId);
            forumData.threads.push(...threadsForForum);
        }
        
        updateThreadsList(forumId);
        
    } catch (error) {
        console.error('Error loading threads:', error);
        updateThreadsList(forumId); // Show what we have locally
    }
}

async function openThread(threadId) {
    currentThreadId = threadId;
    
    try {
        if (isSupabaseInitialized) {
            const { data: thread, error } = await db.getThread(threadId);
            if (error) throw error;
            
            const threadData = {
                id: thread.id,
                forumId: thread.forum_id,
                title: thread.title,
                content: thread.content,
                author: thread.profiles?.display_name || thread.profiles?.username || 'Unknown',
                createdAt: thread.created_at,
                votes: thread.votes || 0,
                commentCount: thread.comment_count || 0
            };
            
            const forum = thread.forums;
            currentForumId = thread.forum_id;

            document.getElementById('currentThreadTitle').textContent = threadData.title;
            document.getElementById('forumBreadcrumbLink').textContent = forum.title;
            document.getElementById('forumBreadcrumbLink').onclick = () => showForumThreads(forum.id || currentForumId);
            
            updateThreadDetail(threadData);
            await loadAndDisplayComments(threadId);
        } else {
            // Fall back to local data
            const thread = forumData.threads.find(t => t.id === threadId);
            if (thread) {
                const forum = forumData.forums.find(f => f.id === thread.forumId);
                currentForumId = forum.id;
                document.getElementById('currentThreadTitle').textContent = thread.title;
                document.getElementById('forumBreadcrumbLink').textContent = forum.title;
                updateThreadDetail(thread);
                updateCommentsList(threadId);
            }
        }
        
        showPage('thread-detail');
        
    } catch (error) {
        console.error('Error opening thread:', error);
        // Fall back to local data
        const thread = forumData.threads.find(t => t.id === threadId);
        if (thread) {
            const forum = forumData.forums.find(f => f.id === thread.forumId);
            currentForumId = forum.id;
            document.getElementById('currentThreadTitle').textContent = thread.title;
            document.getElementById('forumBreadcrumbLink').textContent = forum.title;
            updateThreadDetail(thread);
            updateCommentsList(threadId);
            showPage('thread-detail');
        }
    }
}

function openThreadFromSidebar(threadId) {
    const thread = forumData.threads.find(t => t.id === threadId);
    if (thread) {
        openThread(threadId);
    }
}

async function loadAndDisplayComments(threadId) {
    try {
        if (isSupabaseInitialized) {
            const { data: comments, error } = await db.getComments(threadId);
            if (error) throw error;
            
            const commentsData = comments.map(comment => ({
                id: comment.id,
                threadId: comment.thread_id,
                parentId: comment.parent_id,
                content: comment.content,
                author: comment.profiles?.display_name || comment.profiles?.username || 'Unknown',
                createdAt: comment.created_at,
                votes: comment.votes || 0
            }));
            
            // Update forumData comments for this thread
            forumData.comments = forumData.comments.filter(c => c.threadId !== threadId);
            forumData.comments.push(...commentsData);
        }
        
        updateCommentsList(threadId);
        
    } catch (error) {
        console.error('Error loading comments:', error);
        updateCommentsList(threadId); // Show what we have locally
    }
}

// Enhanced movie interaction functions
async function toggleWatched(movieId) {
    if (!currentUser) {
        showAuthMessage('Please login to track movies', true);
        showPage('auth');
        return;
    }
    const movie = await fetchMovieDetails(movieId);
    if (!movie) return;
    try {
        if (isSupabaseInitialized) {
            const { data: isNowWatched, error } = await db.toggleWatchedMovie(movieId, movie);
            if (error) {
                console.error('Supabase watched movie error:', error);
                throw new Error(error.message.includes('profiles') ? 'User profile not found. Please try logging out and back in.' : error.message);
            }
            const watchBtn = document.getElementById(`watchBtn-${movieId}`);
            if (watchBtn) {
                watchBtn.textContent = isNowWatched ? '✓ Watched' : '+ Add to Watched';
            }
            await loadUserDataFromSupabase();
        } else {
            await toggleWatchedLocal(movieId);
        }
    } catch (error) {
        console.error('Error toggling watched status:', error);
        alert(`Failed to update watched status: ${error.message}`);
    }
}

async function saveReview(movieId) {
    if (!currentUser) {
        showAuthMessage('Please login to write reviews', true);
        showPage('auth');
        return;
    }
    const movie = await fetchMovieDetails(movieId);
    if (!movie) return;
    const reviewText = document.getElementById(`reviewText-${movieId}`)?.value?.trim();
    const ratingStars = document.querySelectorAll(`[data-movie-id="${movieId}"] span.active`);
    const rating = ratingStars.length;
    if (rating === 0) {
        alert('Please select a rating');
        return;
    }
    try {
        if (isSupabaseInitialized) {
            const { error } = await db.saveReview(movieId, movie, rating, reviewText);
            if (error) {
                console.error('Supabase review error:', error);
                throw new Error(error.message.includes('profiles') ? 'User profile not found. Please try logging out and back in.' : error.message);
            }
            toggleReviewForm(movieId);
            const reviewBtn = document.querySelector(`button[onclick="toggleReviewForm(${movieId})"]`);
            if (reviewBtn) reviewBtn.textContent = 'Edit Review';
            await loadUserDataFromSupabase();
        } else {
            await saveReviewLocal(movieId);
        }
    } catch (error) {
        console.error('Error saving review:', error);
        alert(`Failed to save review: ${error.message}`);
    }
}

// Page navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    const targetPage = document.getElementById(pageId + '-page');
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
    });
    
    const targetNav = document.getElementById(pageId + '-nav');
    if (targetNav) {
        targetNav.classList.add('active');
    }
    
    if (pageId === 'profile') {
        updateProfileDisplay();
    } else if (pageId === 'forums') {
        updateForumsList();
    }
    
    // Hide auth message when navigating away from auth page
    if (pageId !== 'auth') {
        hideAuthMessage();
    }
}

// Initialize the app when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, starting initialization...');
    init().catch(error => {
        console.error('Failed to initialize app:', error);
    });
});
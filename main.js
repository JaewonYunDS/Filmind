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

async function loadForumDataSafely() {
    try {
        if (isSupabaseInitialized) {
            console.log('Loading forum data from Supabase...');
            await loadForumDataFromSupabase();
        } else {
            console.error('Supabase not initialized, cannot load forum data');
            forumData.forums = [];
            forumData.threads = [];
            forumData.comments = [];
            updateForumsList();
            updatePopularThreads();
        }
    } catch (error) {
        console.error('Error loading forum data from Supabase:', error);
        forumData.forums = [];
        forumData.threads = [];
        forumData.comments = [];
        updateForumsList();
        updatePopularThreads();
    }
}

// In main.js
async function loadForumDataFromSupabase() {
    try {
        // Load forums
        const { data: forums, error: forumsError } = await db.getForums();
        if (forumsError) throw forumsError;
        forumData.forums = forums.map(forum => ({
            id: forum.id,
            title: forum.title,
            description: forum.description,
            createdBy: forum.profiles?.display_name || forum.profiles?.username || 'Anonymous',
            createdAt: forum.created_at,
            threadCount: forum.thread_count,
            postCount: forum.post_count
        }));

        // Load threads and comments for popular content
        const allThreads = [];
        for (const forum of forumData.forums) {
            const { data: threads, error: threadsError } = await db.getThreads(forum.id);
            if (threadsError) {
                console.warn(`Error loading threads for forum ${forum.id}:`, threadsError);
                continue;
            }
            allThreads.push(...threads.map(thread => ({
                id: thread.id,
                forumId: thread.forum_id,
                title: thread.title,
                content: thread.content,
                author: thread.profiles?.display_name || thread.profiles?.username || 'Anonymous',
                createdAt: thread.created_at,
                votes: thread.votes || 0,
                commentCount: thread.comment_count || 0
            })));
        }
        forumData.threads = allThreads;

        // Load comments for active thread if needed
        if (currentThreadId) {
            const { data: comments, error: commentsError } = await db.getComments(currentThreadId);
            if (commentsError) {
                console.warn(`Error loading comments for thread ${currentThreadId}:`, commentsError);
            } else {
                forumData.comments = comments.map(comment => ({
                    id: comment.id,
                    threadId: comment.thread_id,
                    parentId: comment.parent_id,
                    content: comment.content,
                    author: comment.profiles?.display_name || comment.profiles?.username || 'Anonymous',
                    createdAt: comment.created_at,
                    votes: comment.votes || 0
                }));
            }
        }

        updateForumsList();
        updatePopularThreads();
    } catch (error) {
        console.error('Error loading forum data from Supabase:', error);
        throw error; // Let loadForumDataSafely handle the fallback
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
    if (event) {
        event.stopPropagation();
    }

    if (!currentUser) {
        showAuthMessage('Please login to vote', true);
        showPage('auth');
        return;
    }

    try {
        if (isSupabaseInitialized) {
            const { success, voteDelta, error } = await db.voteOnContent(type, id, direction);
            if (error) throw error;

            if (success) {
                // Update forumData immediately
                if (type === 'thread') {
                    const thread = forumData.threads.find(t => t.id === id);
                    if (thread) {
                        thread.votes = (thread.votes || 0) + voteDelta;
                    }
                } else if (type === 'comment') {
                    const comment = forumData.comments.find(c => c.id === id);
                    if (comment) {
                        comment.votes = (comment.votes || 0) + voteDelta;
                    }
                }

                // Update UI based on current page
                if (currentThreadId) {
                    if (document.getElementById('thread-detail-page').classList.contains('active')) {
                        const thread = forumData.threads.find(t => t.id === currentThreadId);
                        if (thread) {
                            updateThreadDetail(thread);
                            updateCommentsList(currentThreadId);
                        }
                    } else if (document.getElementById('forum-threads-page').classList.contains('active')) {
                        updateThreadsList(currentForumId);
                    }
                }

                // Update popular threads in sidebar
                updatePopularThreads();
            }
        } else {
            voteLocal(type, id, direction, event);
        }
    } catch (error) {
        console.error('Vote failed:', error);
        alert('Failed to vote. Please try again.');
        voteLocal(type, id, direction, event); // Fallback to local
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
    try {
        currentThreadId = threadId;
        let threadData = null;

        if (isSupabaseInitialized && currentUser) {
            const { data, error } = await db.getThread(threadId);
            if (error) throw error;
            threadData = {
                id: data.id,
                forumId: data.forum_id,
                title: data.title,
                content: data.content,
                author: data.profiles?.display_name || data.profiles?.username || 'Unknown',
                createdAt: data.created_at,
                votes: data.votes,
                commentCount: data.comment_count
            };
            const forum = forumData.forums.find(f => f.id === data.forum_id);
            currentForumId = forum ? forum.id : null;
            document.getElementById('currentThreadTitle').textContent = threadData.title;
            document.getElementById('forumBreadcrumbLink').textContent = forum ? forum.title : 'Unknown Forum';
            document.getElementById('forumBreadcrumbLink').onclick = () => showForumThreads(forum ? forum.id : currentForumId);
            updateThreadDetail(threadData);
            await loadAndDisplayComments(threadId);
        } else {
            // Fall back to local data
            const thread = forumData.threads.find(t => t.id === threadId);
            if (thread) {
                const forum = forumData.forums.find(f => f.id === thread.forumId);
                currentForumId = forum ? forum.id : null;
                document.getElementById('currentThreadTitle').textContent = thread.title;
                document.getElementById('forumBreadcrumbLink').textContent = forum ? forum.title : 'Unknown Forum';
                document.getElementById('forumBreadcrumbLink').onclick = () => showForumThreads(forum ? forum.id : currentForumId);
                updateThreadDetail(thread);
                updateCommentsList(threadId);
            } else {
                console.error('Thread not found:', threadId);
                document.getElementById('currentThreadTitle').textContent = 'Thread Not Found';
                document.getElementById('forumBreadcrumbLink').textContent = 'Forums';
                document.getElementById('forumBreadcrumbLink').onclick = () => showForumThreads(currentForumId);
                updateThreadDetail({ title: 'Thread Not Found', content: 'The requested thread could not be found.', author: 'System', createdAt: new Date().toISOString(), votes: 0, commentCount: 0 });
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
            currentForumId = forum ? forum.id : null;
            document.getElementById('currentThreadTitle').textContent = thread.title;
            document.getElementById('forumBreadcrumbLink').textContent = forum ? forum.title : 'Unknown Forum';
            document.getElementById('forumBreadcrumbLink').onclick = () => showForumThreads(forum ? forum.id : currentForumId);
            updateThreadDetail(thread);
            updateCommentsList(threadId);
            showPage('thread-detail');
        } else {
            console.error('Thread not found in fallback:', threadId);
            document.getElementById('currentThreadTitle').textContent = 'Thread Not Found';
            document.getElementById('forumBreadcrumbLink').textContent = 'Forums';
            document.getElementById('forumBreadcrumbLink').onclick = () => showForumThreads(currentForumId);
            updateThreadDetail({ title: 'Thread Not Found', content: 'The requested thread could not be found.', author: 'System', createdAt: new Date().toISOString(), votes: 0, commentCount: 0 });
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
            console.log(`Fetching comments for thread ${threadId} from Supabase...`);
            const { data: comments, error } = await db.getComments(threadId);
            if (error) {
                console.warn(`Error loading comments from Supabase for thread ${threadId}:`, error);
                // Fall back to local data
                updateCommentsList(threadId);
                return;
            }

            // Map comments to the expected format
            const commentsData = comments.map(comment => ({
                id: comment.id,
                threadId: comment.thread_id,
                parentId: comment.parent_id,
                content: comment.content,
                author: comment.profiles?.display_name || comment.profiles?.username || 'Anonymous',
                createdAt: comment.created_at,
                votes: comment.votes || 0
            }));

            // Update forumData.comments for this thread
            forumData.comments = forumData.comments.filter(c => c.threadId !== threadId);
            forumData.comments.push(...commentsData);
        } else {
            console.log('Supabase not initialized, using local comments data');
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
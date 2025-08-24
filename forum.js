// Forum data storage
let forumData = {
    forums: [],
    threads: [],
    comments: [],
    votes: {}
};

function loadForumData() {
    try {
        const saved = JSON.parse(JSON.stringify(forumData));
        forumData = saved;
    } catch (e) {
        console.log('No saved forum data found, initializing with sample data');
        // Initialize with sample comments for testing
        forumData = {
            forums: [],
            threads: [],
            comments: [
                // Sample comment for threadId 1 (adjust threadId as needed)
                {
                    id: 1,
                    threadId: 1,
                    parentId: null,
                    content: 'This is a sample comment for testing.',
                    author: 'Guest',
                    createdAt: new Date().toISOString(),
                    votes: 5
                },
                {
                    id: 2,
                    threadId: 1,
                    parentId: 1,
                    content: 'This is a sample reply.',
                    author: 'Guest',
                    createdAt: new Date().toISOString(),
                    votes: 2
                }
            ],
            votes: {}
        };
    }
}

function saveForumData() {
    console.log('Forum data saved');
}

function updateForumsList() {
    const forumsList = document.getElementById('forumsList');
    if (!forumsList) return;
    
    if (forumData.forums.length === 0) {
        forumsList.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">No forums yet. Create the first one!</p>';
        return;
    }

    const html = forumData.forums.map(forum => `
        <div class="forum-item" onclick="showForumThreads(${forum.id})">
            <div class="forum-title">${forum.title}</div>
            <div class="forum-description">${forum.description}</div>
            <div class="forum-stats">
                <span>${forum.threadCount || 0} threads</span>
                <span>•</span>
                <span>${forum.postCount || 0} posts</span>
                <span>•</span>
                <span>Created by ${forum.createdBy}</span>
            </div>
        </div>
    `).join('');

    forumsList.innerHTML = html;
}

function showCreateForumForm() {
    const form = document.getElementById('createForumForm');
    if (form) {
        form.classList.remove('hidden');
    }
}

function hideCreateForumForm() {
    const form = document.getElementById('createForumForm');
    if (form) {
        form.classList.add('hidden');
    }
    
    const titleInput = document.getElementById('forumTitle');
    const descInput = document.getElementById('forumDescription');
    if (titleInput) titleInput.value = '';
    if (descInput) descInput.value = '';
}

function updateThreadsList(forumId) {
    const threadsList = document.getElementById('threadsList');
    if (!threadsList) return;
    
    const threads = forumData.threads.filter(t => t.forumId === forumId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (threads.length === 0) {
        threadsList.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">No threads yet. Create the first one!</p>';
        return;
    }

    const html = threads.map(thread => {
        const userVote = getUserVote('thread', thread.id);
        return `
            <div class="thread-item" onclick="openThread(${thread.id})">
                <div class="thread-votes">
                    <button class="vote-btn ${userVote === 'up' ? 'upvoted' : ''}" onclick="vote('thread', ${thread.id}, 'up', event)">▲</button>
                    <div class="vote-count">${thread.votes || 0}</div>
                    <button class="vote-btn ${userVote === 'down' ? 'downvoted' : ''}" onclick="vote('thread', ${thread.id}, 'down', event)">▼</button>
                </div>
                <div class="thread-content">
                    <div class="thread-title">${thread.title}</div>
                    <div class="thread-meta">Posted by ${thread.author} • ${timeAgo(thread.createdAt)}</div>
                    <div class="thread-preview">${thread.content.substring(0, 200)}${thread.content.length > 200 ? '...' : ''}</div>
                    <div class="thread-stats">
                        <span>${thread.commentCount || 0} comments</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    threadsList.innerHTML = html;
}

function showCreateThreadForm() {
    const form = document.getElementById('createThreadForm');
    if (form) {
        form.classList.remove('hidden');
    }
}

function hideCreateThreadForm() {
    const form = document.getElementById('createThreadForm');
    if (form) {
        form.classList.add('hidden');
    }
    
    const titleInput = document.getElementById('threadTitle');
    const contentInput = document.getElementById('threadContent');
    if (titleInput) titleInput.value = '';
    if (contentInput) contentInput.value = '';
}

function updateThreadDetail(thread) {
    const userVote = getUserVote('thread', thread.id);
    const html = `
        <div style="display: flex; gap: 1rem; margin-bottom: 2rem;">
            <div class="thread-votes">
                <button class="vote-btn ${userVote === 'up' ? 'upvoted' : ''}" onclick="vote('thread', ${thread.id}, 'up', event)">▲</button>
                <div class="vote-count">${thread.votes || 0}</div>
                <button class="vote-btn ${userVote === 'down' ? 'downvoted' : ''}" onclick="vote('thread', ${thread.id}, 'down', event)">▼</button>
            </div>
            <div style="flex: 1;">
                <h1 style="margin-bottom: 0.5rem;">${thread.title}</h1>
                <div style="font-size: 0.9rem; color: #999; margin-bottom: 1rem;">
                    Posted by ${thread.author} • ${timeAgo(thread.createdAt)}
                </div>
                <div style="line-height: 1.6; color: #ccc;">
                    ${thread.content.replace(/\n/g, '<br>')}
                </div>
            </div>
        </div>
    `;
    
    const threadDetail = document.getElementById('threadDetail');
    if (threadDetail) {
        threadDetail.innerHTML = html;
    }
}

function updateCommentsList(threadId) {
    const comments = forumData.comments.filter(c => c.threadId === threadId)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const commentsList = document.getElementById('commentsSection');
    if (!commentsList) return;

    if (comments.length === 0) {
        commentsList.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">No comments yet. Be the first to comment!</p>';
        return;
    }

    const html = comments.map(comment => {
        const userVote = getUserVote('comment', comment.id);
        return `
            <div class="comment ${comment.parentId ? 'reply' : ''}">
                <div class="comment-header">
                    <span class="comment-author">${comment.author}</span>
                    <span class="comment-time">${timeAgo(comment.createdAt)}</span>
                </div>
                <div class="comment-content">${comment.content.replace(/\n/g, '<br>')}</div>
                <div class="comment-actions">
                    <div class="comment-votes">
                        <button class="vote-btn ${userVote === 'up' ? 'upvoted' : ''}" onclick="vote('comment', ${comment.id}, 'up', event)">▲</button>
                        <div class="vote-count">${comment.votes || 0}</div>
                        <button class="vote-btn ${userVote === 'down' ? 'downvoted' : ''}" onclick="vote('comment', ${comment.id}, 'down', event)">▼</button>
                    </div>
                    ${currentUser ? `<button class="reply-btn" onclick="showReplyForm(${comment.id})">Reply</button>` : ''}
                </div>
                <div id="replyForm-${comment.id}" class="comment-form hidden">
                    <textarea id="replyText-${comment.id}" class="form-textarea" placeholder="Write your reply..."></textarea>
                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick="addReply(${comment.id})">Post Reply</button>
                        <button class="btn btn-secondary" onclick="hideReplyForm(${comment.id})">Cancel</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    commentsList.innerHTML = html;
}

function renderComment(comment, allComments, isReply = false) {
    const userVote = getUserVote('comment', comment.id);
    const replies = allComments.filter(c => c.parentId === comment.id);
    
    let html = `
        <div class="comment ${isReply ? 'reply' : ''}">
            <div class="comment-header">
                <span class="comment-author">${comment.author}</span>
                <span class="comment-time">${timeAgo(comment.createdAt)}</span>
            </div>
            <div class="comment-content">${comment.content.replace(/\n/g, '<br>')}</div>
            <div class="comment-actions">
                <div class="comment-votes">
                    <button class="vote-btn ${userVote === 'up' ? 'upvoted' : ''}" onclick="vote('comment', ${comment.id}, 'up', event)">▲</button>
                    <span class="vote-count">${comment.votes || 0}</span>
                    <button class="vote-btn ${userVote === 'down' ? 'downvoted' : ''}" onclick="vote('comment', ${comment.id}, 'down', event)">▼</button>
                </div>
                <button class="reply-btn" onclick="showReplyForm(${comment.id})">Reply</button>
            </div>
            <div id="replyForm-${comment.id}" class="comment-form hidden" style="margin-top: 1rem;">
                <textarea class="form-textarea" id="replyText-${comment.id}" placeholder="Write your reply..."></textarea>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="addReply(${comment.id})">Post Reply</button>
                    <button class="btn btn-secondary" onclick="hideReplyForm(${comment.id})">Cancel</button>
                </div>
            </div>
        </div>
    `;
    
    replies.forEach(reply => {
        html += renderComment(reply, allComments, true);
    });
    
    return html;
}

function showReplyForm(commentId) {
    const form = document.getElementById(`replyForm-${commentId}`);
    if (form) {
        form.classList.remove('hidden');
    }
}

function hideReplyForm(commentId) {
    const form = document.getElementById(`replyForm-${commentId}`);
    if (form) {
        form.classList.add('hidden');
    }
    
    const textArea = document.getElementById(`replyText-${commentId}`);
    if (textArea) {
        textArea.value = '';
    }
}

// Local voting system (fallback when not using Supabase)
function voteLocal(type, id, direction, event) {
    if (event) {
        event.stopPropagation();
    }
    
    const voteKey = `${type}_${id}`;
    const currentVote = forumData.votes[voteKey];
    
    let newVote = null;
    let voteDelta = 0;
    
    if (currentVote === direction) {
        newVote = null;
        voteDelta = direction === 'up' ? -1 : 1;
    } else if (currentVote) {
        newVote = direction;
        voteDelta = direction === 'up' ? 2 : -2;
    } else {
        newVote = direction;
        voteDelta = direction === 'up' ? 1 : -1;
    }
    
    if (newVote) {
        forumData.votes[voteKey] = newVote;
    } else {
        delete forumData.votes[voteKey];
    }
    
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
    
    saveForumData();
    
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
}

function getUserVote(type, id) {
    const voteKey = `${type}_${id}`;
    return forumData.votes[voteKey] || null;
}

// Local functions for creating content when not authenticated
function addCommentLocal() {
    const content = document.getElementById('newCommentText').value.trim();
    
    if (!content) {
        alert('Please enter a comment');
        return;
    }

    const newComment = {
        id: forumData.comments.length > 0 ? Math.max(...forumData.comments.map(c => c.id)) + 1 : 1,
        threadId: currentThreadId,
        parentId: null,
        content: content,
        author: userData.name,
        createdAt: new Date().toISOString(),
        votes: 0
    };

    forumData.comments.push(newComment);
    
    const thread = forumData.threads.find(t => t.id === currentThreadId);
    if (thread) thread.commentCount = (thread.commentCount || 0) + 1;
    
    saveForumData();
    updateCommentsList(currentThreadId);
    document.getElementById('newCommentText').value = '';
}

function addReplyLocal(parentId) {
    const content = document.getElementById(`replyText-${parentId}`).value.trim();
    
    if (!content) {
        alert('Please enter a reply');
        return;
    }

    const newComment = {
        id: forumData.comments.length > 0 ? Math.max(...forumData.comments.map(c => c.id)) + 1 : 1,
        threadId: currentThreadId,
        parentId: parentId,
        content: content,
        author: userData.name,
        createdAt: new Date().toISOString(),
        votes: 0
    };

    forumData.comments.push(newComment);
    
    const thread = forumData.threads.find(t => t.id === currentThreadId);
    if (thread) thread.commentCount = (thread.commentCount || 0) + 1;
    
    saveForumData();
    updateCommentsList(currentThreadId);
    hideReplyForm(parentId);
}

function createForumLocal() {
    const title = document.getElementById('forumTitle').value.trim();
    const description = document.getElementById('forumDescription').value.trim();

    if (!title) {
        alert('Please enter a forum title');
        return;
    }

    const newForum = {
        id: forumData.forums.length > 0 ? Math.max(...forumData.forums.map(f => f.id)) + 1 : 1,
        title: title,
        description: description || 'No description provided',
        createdBy: userData.name,
        createdAt: new Date().toISOString(),
        threadCount: 0,
        postCount: 0
    };

    forumData.forums.push(newForum);
    saveForumData();
    updateForumsList();
    hideCreateForumForm();
}

function createThreadLocal() {
    const title = document.getElementById('threadTitle').value.trim();
    const content = document.getElementById('threadContent').value.trim();

    if (!title || !content) {
        alert('Please enter both title and content');
        return;
    }

    const newThread = {
        id: forumData.threads.length > 0 ? Math.max(...forumData.threads.map(t => t.id)) + 1 : 1,
        forumId: currentForumId,
        title: title,
        content: content,
        author: userData.name,
        createdAt: new Date().toISOString(),
        votes: 0,
        commentCount: 0
    };

    forumData.threads.push(newThread);
    
    const forum = forumData.forums.find(f => f.id === currentForumId);
    if (forum) forum.threadCount = (forum.threadCount || 0) + 1;
    
    saveForumData();
    updateThreadsList(currentForumId);
    hideCreateThreadForm();
}
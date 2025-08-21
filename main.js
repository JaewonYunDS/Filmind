// Main application logic
let currentForumId = null;
let currentThreadId = null;

function init() {
    loadUserData();
    loadForumData();
    initializeSampleForums();
    updateProfileStats();
    updateForumsList();
    setupSearch();
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
}

// Initialize the app when page loads
document.addEventListener('DOMContentLoaded', init);
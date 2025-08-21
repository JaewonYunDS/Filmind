let userData = {
    name: 'CineUser',
    watchedFilms: [],
    reviews: []
};

function loadUserData() {
    try {
        const saved = JSON.parse(JSON.stringify(userData));
        userData = saved;
    } catch (e) {
        console.log('No saved user data found');
    }
}

function saveUserData() {
    console.log('User data saved');
}

async function toggleWatched(movieId) {
    const movie = await fetchMovieDetails(movieId);
    if (!movie) return;
    
    const watchedIndex = userData.watchedFilms.findIndex(f => f.id === movieId);

    if (watchedIndex === -1) {
        userData.watchedFilms.push({
            id: movie.id,
            title: movie.title,
            year: movie.year,
            poster: movie.poster,
            watchedDate: new Date().toISOString()
        });
        document.getElementById(`watchBtn-${movieId}`).textContent = '✓ Watched';
    } else {
        userData.watchedFilms.splice(watchedIndex, 1);
        document.getElementById(`watchBtn-${movieId}`).textContent = '+ Add to Watched';
    }

    saveUserData();
    updateProfileStats();
}

function toggleReviewForm(movieId) {
    const form = document.getElementById(`reviewForm-${movieId}`);
    form.classList.toggle('hidden');
}

function setRating(movieId, rating) {
    setRatingDisplay(movieId, rating);
}

function setRatingDisplay(movieId, rating) {
    const stars = document.querySelectorAll(`[data-movie-id="${movieId}"] span`);
    stars.forEach((star, index) => {
        star.classList.toggle('active', index < rating);
    });
}

async function saveReview(movieId) {
    const movie = await fetchMovieDetails(movieId);
    if (!movie) return;
    
    const reviewText = document.getElementById(`reviewText-${movieId}`).value.trim();
    const ratingStars = document.querySelectorAll(`[data-movie-id="${movieId}"] span.active`);
    const rating = ratingStars.length;

    if (rating === 0) {
        alert('Please select a rating');
        return;
    }

    userData.reviews = userData.reviews.filter(r => r.movieId !== movieId);

    userData.reviews.unshift({
        movieId: movieId,
        title: movie.title,
        year: movie.year,
        poster: mock.poster,
        rating: rating,
        text: reviewText,
        date: new Date().toISOString()
    });

    if (!userData.watchedFilms.some(f => f.id === movieId)) {
        await toggleWatched(movieId);
    }

    toggleReviewForm(movieId);
    saveUserData();
    updateProfileStats();

    document.querySelector(`button[onclick="toggleReviewForm(${movieId})"]`).textContent = 'Edit Review';
}

function updateProfileStats() {
    document.getElementById('filmCount').textContent = userData.watchedFilms.length;
    document.getElementById('reviewCount').textContent = userData.reviews.length;

    if (userData.reviews.length > 0) {
        const avgRating = userData.reviews.reduce((sum, review) => sum + review.rating, 0) / userData.reviews.length;
        document.getElementById('avgRating').textContent = avgRating.toFixed(1);
    } else {
        document.getElementById('avgRating').textContent = '0.0';
    }
}

function updateProfileDisplay() {
    updateProfileStats();
    displayUserFilms();
}

function displayUserFilms() {
    const filmsGrid = document.getElementById('userFilms');

    if (userData.watchedFilms.length === 0) {
        filmsGrid.innerHTML = '<p style="text-align: center; color: #999; grid-column: 1/-1;">No films logged yet. Start by searching for movies!</p>';
        return;
    }

    const html = userData.watchedFilms.slice(0, 12).map(film => `
        <div style="cursor: pointer; transition: transform 0.2s;" onclick="showMovieDetail(${film.id})" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            <img src="${film.poster}" alt="${film.title}" style="width: 100%; height: 180px; object-fit: cover; border-radius: 4px; margin-bottom: 0.5rem;">
            <div style="font-size: 0.8rem; color: white; text-align: center; line-height: 1.2;">${film.title}</div>
            <div style="font-size: 0.7rem; color: #999; text-align: center;">${film.year}</div>
        </div>
    `).join('');

    filmsGrid.innerHTML = html;
}
// TMDB API Configuration
const TMDB_API_KEY = '7d0f1f2036d4dc0188fb3dcd12c945a2';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const DEFAULT_POSTER = 'https://via.placeholder.com/300x450/333/fff?text=No+Image';

// Cache for movie details
let movieCache = {};

async function fetchMovieDetails(movieId) {
    if (movieCache[movieId]) {
        return movieCache[movieId];
    }

    try {
        const response = await fetch(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=credits`);
        const movie = await response.json();
        
        if (!movie.release_date || movie.release_date.trim() === '') {
            return null;
        }
        
        const formattedMovie = {
            id: movie.id,
            title: movie.title,
            year: movie.release_date ? parseInt(movie.release_date.split('-')[0]) : 'N/A',
            director: movie.credits?.crew?.find(member => member.job === 'Director')?.name || 'Unknown',
            genre: movie.genres.map(genre => genre.name),
            runtime: movie.runtime || 0,
            rating: movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A',
            poster: movie.poster_path ? TMDB_IMAGE_BASE_URL + movie.poster_path : DEFAULT_POSTER,
            overview: movie.overview || 'No overview available.',
            credits: {
                cast: movie.credits?.cast || [],
                crew: movie.credits?.crew || []
            }
        };
        
        movieCache[movieId] = formattedMovie;
        return formattedMovie;
    } catch (error) {
        console.error('Error fetching movie details:', error);
        return null;
    }
}

async function showMovieDetail(movieId) {
    const movie = await fetchMovieDetails(movieId);
    if (!movie) {
        document.getElementById('movieContent').innerHTML = '<p style="color: #999;">Error loading movie details.</p>';
        showPage('movie');
        return;
    }

    document.getElementById('searchResults').classList.add('hidden');
    document.getElementById('searchInput').value = '';

    const isWatched = userData.watchedFilms.some(f => f.id === movieId);
    const userReview = userData.reviews.find(r => r.movieId === movieId);

    const actors = movie.credits?.cast?.slice(0, 5).map(actor => actor.name).join(', ') || 'Unknown';

    const movieHtml = `
        <div class="movie-header">
            <img src="${movie.poster}" alt="${movie.title}" class="movie-poster">
            <div class="movie-info">
                <h1>${movie.title} (${movie.year})</h1>
                <div class="movie-meta">
                    <span>Directed by ${movie.director}</span>
                    <span>•</span>
                    <span>${movie.runtime} min</span>
                    <span>•</span>
                    <span>${movie.genre.join(', ')}</span>
                </div>
                <div class="rating-stars">★★★★★ ${movie.rating}/10</div>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="toggleWatched(${movie.id})" id="watchBtn-${movie.id}">
                        ${isWatched ? '✓ Watched' : '+ Add to Watched'}
                    </button>
                    <button class="btn btn-secondary" onclick="toggleReviewForm(${movie.id})">
                        ${userReview ? 'Edit Review' : 'Write Review'}
                    </button>
                </div>
                <div id="reviewForm-${movie.id}" class="review-form hidden">
                    <div class="star-rating" data-movie-id="${movie.id}">
                        ${[1,2,3,4,5].map(i => `<span onclick="setRating(${movie.id}, ${i})" data-rating="${i}">★</span>`).join('')}
                    </div>
                    <textarea class="review-textarea" placeholder="Write your review..." id="reviewText-${movie.id}">${userReview ? userReview.text : ''}</textarea>
                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick="saveReview(${movie.id})">Save Review</button>
                        <button class="btn btn-secondary" onclick="toggleReviewForm(${movie.id})">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="movie-overview">
            <h3 style="margin-bottom: 1rem;">Synopsis</h3>
            <p>${movie.overview}</p>
        </div>
        
        <div style="margin-top: 2rem;">
            <h3 style="margin-bottom: 1rem; color: #ff6b35;">Cast</h3>
            <p style="color: #cccccc;">${actors}</p>
        </div>
    `;

    document.getElementById('movieContent').innerHTML = movieHtml;

    if (userReview) {
        setRatingDisplay(movie.id, userReview.rating);
    }

    showPage('movie');
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    searchInput.addEventListener('input', async function(e) {
        const query = e.target.value.trim();
        if (query.length < 2) {
            searchResults.classList.add('hidden');
            return;
        }

        try {
            const response = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`);
            const data = await response.json();
            const validResults = data.results
                .filter(movie => movie.release_date && movie.release_date.trim() !== '')
                .sort((a, b) => b.popularity - a.popularity)
                .slice(0, 5);
            displaySearchResults(validResults);
        } catch (error) {
            console.error('Error fetching search results:', error);
        }
    });

    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    });
}

function displaySearchResults(results) {
    if (results.length === 0) {
        searchResults.innerHTML = '<div style="padding: 1rem; color: #999;">No results found.</div>';
        searchResults.classList.remove('hidden');
        return;
    }

    const html = results.map(movie => `
        <div class="search-result" onclick="showMovieDetail(${movie.id})">
            <img src="${movie.poster_path ? TMDB_IMAGE_BASE_URL + movie.poster_path : DEFAULT_POSTER}" alt="${movie.title}">
            <div class="search-result-info">
                <h4>${movie.title}</h4>
                <p>${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</p>
            </div>
        </div>
    `).join('');

    searchResults.innerHTML = html;
    searchResults.classList.remove('hidden');
}
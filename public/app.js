const feedContainer = document.querySelector('#dynamic-feed');
const postButton = document.querySelector('.fab-post');
const postForm = document.querySelector('#post-form');

const API_URL = 'http://localhost:3000/api/listings';

function loadFeed() {

    fetch(API_URL)
        .then(res => res.json())
        .then(data => {
            feedContainer.innerHTML = '';

            if (data.length === 0) {
                feedContainer.innerHTML = '<h3>Δεν υπάρχουν διαθέσιμες αγγελίες.</h3>';
                return;
            }

            // Loop for each listing and create a card
            data.forEach(listing => {
                const card = document.createElement('article');
                card.className = 'food-card';

                card.innerHTML = `
                    <div class="card-img-container">
                        <img 
                            src="${listing.photo_url || 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&auto=format&fit=crop'}" 
                            alt="${listing.title}" 
                            class="card-img"
                        >
                        <span class="badge green">${listing.available_portions || 1} Portions Left</span>
                    </div>

                    <div class="card-info">
                        <div class="info-top">
                            <h3 class="food-title">${listing.title}</h3>
                            <p class="location-text">
                                <span class="material-icons small-icon">location_on</span>
                                ${listing.pickup_location || 'Μη ορισμένη τοποθεσία'}
                            </p>
                        </div>

                        <p>${listing.description || 'Χωρίς περιγραφή.'}</p>

                        <div class="info-bottom">
                            <span class="cook-name">Pickup: ${listing.pickup_time ? formatPickupTime(listing.pickup_time) : 'Άμεσα'}</span>
                            <button class="btn-reserve">Reserve</button>
                        </div>
                    </div>
                `;

                feedContainer.appendChild(card);
            });
        })
        // Το exception catching της Fetch API
        .catch(error => {
            console.error('Error loading listings:', error);
            feedContainer.innerHTML = '<h3>Σφάλμα κατά τη φόρτωση αγγελιών. Σιγουρέψου ότι ο server τρέχει!</h3>';
        });
}


postButton.addEventListener('click', function (e) {

    e.preventDefault();

    postForm.classList.toggle('hidden');

});

function formatPickupTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('el-GR', {
        dateStyle: 'short',
        timeStyle: 'short'
    });
}

loadFeed();
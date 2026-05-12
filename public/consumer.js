const CURRENT_USER_ID = localStorage.getItem('unibite_user_id');
const feedContainer = document.querySelector('#dynamic-feed');

if (!CURRENT_USER_ID) {
    window.location.href = 'login.html';
}

const map = L.map('map').setView([38.2466, 21.7346], 13);
const markersLayer = L.layerGroup().addTo(map);
let userLocation = {lat: 38.2466, lng: 21.7346};
let userMarker = null

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

const listBtn = document.getElementById('list-view-btn');
const mapBtn = document.getElementById('map-view-btn');
const mapDiv = document.getElementById('map');
const feedDiv = document.getElementById('dynamic-feed');

const logoutBtn = document.getElementById('btn-logout');
const btnBecomeCook = document.getElementById('btn-become-cook');

let currentOrderIdToReview = null;
let currentRating = 0;

// Map function
function toggleView(showMap) {
    if (showMap) {
        // Show map - Hidden List
        mapDiv.classList.remove('hidden-view');
        feedDiv.classList.add('hidden-view');

        mapBtn.classList.add('active');
        listBtn.classList.remove('active');

        setTimeout(() => {
            map.invalidateSize();
            map.setView([userLocation.lat, userLocation.lng], 13);
        }, 100);
    } else {
        // Show List - Hidden map
        mapDiv.classList.add('hidden-view');
        feedDiv.classList.remove('hidden-view');

        listBtn.classList.add('active');
        mapBtn.classList.remove('active');
    }
}

// Distance filter
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth Radius (km)
    // Coordinate Formula
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    // Haversine Formula for Distance
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

function getUserLocation() {
    if (!navigator.geolocation) {
        loadFeed();
        return;
    }
    navigator.geolocation.getCurrentPosition(
        position => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            map.setView([userLocation.lat, userLocation.lng], 13);

            if (userMarker) map.removeLayer(userMarker);
            userMarker = L.circle([userLocation.lat, userLocation.lng], {
                radius: 200,
                color: '#2ecc71',
                fillColor: '#2ecc71',
                fillOpacity: 0.5
            }).addTo(map).bindPopup("You are here!");

            loadFeed();
        },
        error => {
            console.error("Location denied, using default (Patras).", error);
            loadFeed();
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
}

function filterByDistance(maxKm) {
    const limit = parseFloat(maxKm);

    // 1. Φιλτράρισμα Καρτών
    const cards = document.querySelectorAll('.food-card');
    cards.forEach(card => {
        const d = parseFloat(card.dataset.distance);
        card.style.display = d > limit ? 'none' : 'block';
    });

    // 2. Φιλτράρισμα Markers
    markersLayer.eachLayer(marker => {
        const d = marker.options.distance;
        if (d > limit) {
            map.removeLayer(marker);
        } else {
            if (!map.hasLayer(marker)) {
                marker.addTo(map);
            }
        }
    });
}

// Dynamic Feed
function loadFeed() {
    feedContainer.innerHTML = '';

    fetch('/api/listings')
        .then(res => res.json())
        .then(data => {
            console.log(data)
            // Check if array empty
            if (data.length === 0) {
                feedContainer.innerHTML = '<h3>Δεν υπάρχουν διαθέσιμες αγγελίες.</h3>';
                return;
            }

            if (typeof markersLayer !== 'undefined') markersLayer.clearLayers();

            // Card drawing
            data.forEach(listing => {
                const id = listing.listing_id;
                const portions = listing.available_portions ?? 0;
                const isExhausted = portions <= 0;

                const lat = listing.latitude || 38.2466;
                const lng = listing.longitude || 21.7346;

                const dist = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);

                // List View
                const card = document.createElement('article');
                card.className = `food-card ${isExhausted ? 'noAvailability' : ''}`;

                card.dataset.distance = dist;

                card.innerHTML = `
                    <div class="card-img-container">
                        <img src="${listing.photo_url || 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500'}" class="card-img">
                        <span class="badge ${isExhausted ? 'grey-badge' : 'green'}">
                            ${portions} Portions Left
                        </span>
                    </div>
                    <div class="card-info">
                        <div class="info-top">
                            <h3 class="food-title">${listing.title}</h3>
                            <p class="location-text"><span class="material-icons">location_on</span>${listing.pickup_location}</p>
                        </div>
                        <p>${listing.description}</p>
                        <div class="info-bottom">
                            <span>Pickup: ${listing.pickup_time ? formatPickupTime(listing.pickup_time) : 'Άμεσα'}</span>
                            <button class="btn-reserve" data-listing-id="${id}" ${isExhausted ? 'disabled   ' : ''}>
                                ${isExhausted ? 'Sold Out' : 'Reserve'}
                            </button>
                        </div>
                    </div>
                `;
                feedContainer.appendChild(card);

                // Map View
                if (typeof markersLayer !== 'undefined') {
                    const marker = L.marker([lat, lng]);
                    marker.options.distance = dist;
                    marker.bindPopup(`
                        <div style="text-align:center">
                            <h4>${listing.title}</h4>
                            <p>Portions: ${portions}</p>
                            <button class="reserve-btn" data-listing-id="${id}" ${isExhausted ? 'disabled' : ''}>
                                ${isExhausted ? 'Sold Out' : 'Reserve'}
                            </button>
                        </div>
                    `);
                    markersLayer.addLayer(marker);
                }
            });
        })
        .catch(err => {
            console.error(err);
            feedContainer.innerHTML = '<h3>Σφάλμα σύνδεσης.</h3>';
        });
}

function formatPickupTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('el-GR', {
        dateStyle: 'short',
        timeStyle: 'short'
    });
}

function loadOrders() {
    const ordersContainer = document.getElementById('orders-container');
    if (!ordersContainer) return;

    ordersContainer.innerHTML = '<p>Φόρτωση...</p>';

    fetch(`/api/orders?userId=${CURRENT_USER_ID}`)
        .then(res => res.json())
        .then(orders => {
            console.log("Δεδομένα Παραγγελιών:", orders);

            if (!orders || orders.length === 0) {
                ordersContainer.innerHTML = '<h3>Δεν έχεις παραγγελίες ακόμα.</h3>';
                return;
            }

            ordersContainer.innerHTML = '';

            orders.forEach(order => {
                const statusClass = order.statusClass || 'pending';
                const statusText = order.statusText || 'Σε αναμονή';

                const card = document.createElement('article');
                card.className = `order-card ${statusClass}`;

                card.innerHTML = `
                    <div class="order-header">
                        <span class="order-date">${formatPickupTime(order.date)}</span>
                        <span class="order-badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="order-body">
                        <div class="order-icon"><span class="material-icons">restaurant</span></div>
                        <div class="order-info">
                            <h4>${order.title}</h4>
                            <p>Από: ${order.cook}</p>
                        </div>
                    </div>
                    ${order.needsReview === 1 ? `
                    <div class="order-actions">
                        <button class="btn-review" onclick="openReviewModal(${order.id}, '${order.title}')">
                            <span class="material-icons" style="font-size: 14px; vertical-align: middle;">star</span> 
                            Αξιολόγηση
                        </button>
                    </div>` : ''}
                `;
                ordersContainer.appendChild(card);
            });
        })
        .catch(err => {
            console.error(err);
            ordersContainer.innerHTML = '<h3>Σφάλμα φόρτωσης παραγγελιών.</h3>';
        });
}


// --- Functions Διαχείρισης Modal & Stars ---
function openReviewModal(orderId, orderTitle) {
    currentOrderIdToReview = orderId;
    currentRating = 0;

    const modal = document.getElementById('review-modal');
    const modalTitle = document.getElementById('review-modal-title');

    if (modal) {
        modalTitle.innerText = `Αξιολόγηση: ${orderTitle}`;
        modal.classList.remove('hidden-view');
        updateStars(0);
        document.getElementById('review-comments').value = '';
    }
}

function closeReviewModal() {
    const modal = document.getElementById('review-modal');
    if (modal) {
        modal.classList.add('hidden-view');
    }
    currentOrderIdToReview = null;
    currentRating = 0;
}

function updateStars(rating) {
    const stars = document.querySelectorAll('.star-rating .star');
    stars.forEach(star => {
        const val = parseInt(star.getAttribute('data-value'));
        if (val <= rating) {
            star.innerText = 'star';
            star.classList.add('active');
        } else {
            star.innerText = 'star_border';
            star.classList.remove('active');
        }
    });
}

async function submitReview() {
    // 1. Έλεγχος αν ο χρήστης επέλεξε αστέρια
    if (!currentRating || currentRating === 0) {
        alert("Παρακαλώ επίλεξε βαθμολογία (αστέρια) πριν την υποβολή!");
        return;
    }

    // Δεδομένα προς αποστολή - Συμβατά με το API της Μαρίας
    const reviewData = {
        request_id: currentOrderIdToReview,
        consumer_id: CURRENT_USER_ID,
        score: currentRating,
    };

    try {
        const response = await fetch('/api/ratings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reviewData)
        });

        const result = await response.json();

        if (response.ok) {
            alert("Ευχαριστούμε! " + result.message);
            closeReviewModal();
            loadOrders();
        } else {
            alert("Σφάλμα: " + result.error);
        }

    } catch (error) {
        console.error("Connection error:", error);
        alert("Υπήρξε πρόβλημα στη σύνδεση με τον διακομιστή.");
    }
}

// --- Profile Loader ---
function loadProfile() {
    console.log("Αναζήτηση προφίλ για τον χρήστη:", CURRENT_USER_ID);

    const nameElem = document.getElementById('profile-name');
    const emailElem = document.getElementById('profile-email');
    const pointsElem = document.getElementById('profile-points');

    fetch(`/api/users/${CURRENT_USER_ID}`)
        .then(res => {
            if (!res.ok) throw new Error("Ο χρήστης δεν βρέθηκε");
            return res.json();
        })
        .then(userData => {
            if (nameElem) nameElem.innerText = userData.username;
            if (emailElem) emailElem.innerText = userData.email;
            if (pointsElem) pointsElem.innerText = userData.points;
        })
        .catch(err => {
            console.error("Σφάλμα φόρτωσης προφίλ:", err);
            // Fallback σε περίπτωση που πέσει ο server
            if (nameElem) nameElem.innerText = "Άγνωστος Χρήστης";
            if (pointsElem) pointsElem.innerText = "-";
        });
}

function switchView(viewName) {
    // 1. Κρύβουμε όλα
    document.getElementById('home-view').classList.add('hidden-view');
    document.getElementById('orders-view').classList.add('hidden-view');
    document.getElementById('profile-view').classList.add('hidden-view');

    // 2. Εμφανίζουμε αυτό που θέλουμε
    document.getElementById(viewName + '-view').classList.remove('hidden-view');

    // 3. Ενημερώνουμε τα κουμπιά
    document.getElementById('nav-home').classList.remove('active');
    document.getElementById('nav-orders').classList.remove('active');
    document.getElementById('nav-profile').classList.remove('active');
    document.getElementById('nav-' + viewName).classList.add('active');

    if (viewName === 'home') setTimeout(() => { map.invalidateSize(); }, 100);
    else if (viewName === 'orders') loadOrders();
    else if (viewName === 'profile') loadProfile();
}

// -- Event Listeners --
feedContainer.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-reserve')) {
        e.preventDefault();

        const listingId = e.target.getAttribute('data-listing-id');

        try {
            const response = await fetch('/api/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ listing_id: listingId, consumer_id: CURRENT_USER_ID })
            });

            const data = await response.json();

            if (response.ok) {
                alert("Τέλεια! " + data.message);
                e.target.innerText = "Pending...";
                e.target.disabled = true;
                e.target.style.backgroundColor = "gray";
            } else {
                alert("Αποτυχία: " + data.error);
            }

        } catch (error) {
            console.error("Σφάλμα σύνδεσης:", error);
            alert("Υπήρξε πρόβλημα με τον server.");
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const stars = document.querySelectorAll('.star-rating .star');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            currentRating = parseInt(star.getAttribute('data-value'));
            updateStars(currentRating);
        });
    });
});

document.getElementById('distance-range').addEventListener('input', (e) => {
    const radius = e.target.value;
    document.getElementById('range-value').innerText = radius;
    filterByDistance(radius);
});

listBtn.addEventListener('click', () => toggleView(false));
mapBtn.addEventListener('click', () => toggleView(true));

document.getElementById('btn-logout').addEventListener('click',(e) => {
    const confirmLogout = confirm("Είσαι σίγουρος ότι θέλεις να αποσυνδεθείς;");

    if (confirmLogout) {
        localStorage.removeItem('unibite_token');
        localStorage.removeItem('unibite_user_id');

        window.location.href = '/';
    }
});

document.getElementById('btn-become-cook').addEventListener('click', () => { window.location.href = 'cook.html';})

getUserLocation();

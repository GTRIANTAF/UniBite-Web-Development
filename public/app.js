const feedContainer = document.querySelector('#dynamic-feed');
const postButton = document.querySelector('.fab-post');

const map = L.map('map').setView([38.2466, 21.7346], 13);
const markersLayer = L.layerGroup().addTo(map);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors © CARTO'
}).addTo(map);

const listBtn = document.getElementById('list-view-btn');
const mapBtn = document.getElementById('map-view-btn');
const mapDiv = document.getElementById('map');
const feedDiv = document.getElementById('dynamic-feed');

const API_URL = '/api/listings';

// Map function
function toggleView(showMap) {
    if (showMap) {
        // Show map - Hidden List
        mapDiv.classList.remove('hidden-view');
        feedDiv.classList.add('hidden-view');

        mapBtn.classList.add('active');
        listBtn.classList.remove('active');
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
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            map.setView([userLocation.lat, userLocation.lng], 13);

            // Add a marker for the user's location
            L.circle([userLocation.lat, userLocation.lng], {
                radius: 200,
                color: '#2ecc71',
                fillColor: '#2ecc71',
                fillOpacity: 0.5
            }).addTo(map).bindPopup("You are here!");
            loadFeed();
        }, error => {
            console.error("Άρνηση τοποθεσίας, χρησιμοποιούμε προεπιλογή Πάτρα.");
            loadFeed();
        });
    } else {
        loadFeed();
    }
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

    fetch(API_URL)
        .then(res => res.json())
        .then(data => {
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
    ordersContainer.innerHTML = '<p>Φόρτωση...</p>';

    fetch(`/api/orders`)
        .then(res => res.json())
        .then(orders => {
            console.log(orders);
            if (!orders || orders.length === 0) {
                ordersContainer.innerHTML = '<h3>Δεν έχεις παραγγελίες ακόμα.</h3>';
                return;
            }

            ordersContainer.innerHTML = '';
            orders.forEach(order => {
                const status = (order.status || 'pending').toLowerCase();
                const card = document.createElement('article');
                card.className = `order-card ${status}`;
                card.innerHTML = `
                    <div class="order-header">
                        <span class="order-date">${formatPickupTime(order.created_at)}</span>
                        <span class="order-badge ${status}">${status}</span>
                    </div>
                    <div class="order-body">
                        <div class="order-icon"><span class="material-icons">restaurant</span></div>
                        <div class="order-info">
                            <h4>${order.title}</h4>
                            <p>${order.pickup_location || ''}</p>
                        </div>
                    </div>
                    ${status === 'completed' ? `
                    <div class="order-actions">
                        <button class="btn-review" data-order-id="${order.request_id}">Αξιολόγηση</button>
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

    if (viewName === 'home' && typeof map !== 'undefined') {
        setTimeout(() => { map.invalidateSize(); }, 100);
    } else if (viewName === 'orders') {
        if (typeof loadOrders === "function") loadOrders();
    } else if (viewName === 'profile') {
        if (typeof loadProfile === "function") loadProfile();
    }
}

// -- Event Listeners --
feedContainer.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-reserve')) {
        e.preventDefault();

        const listingId = e.target.getAttribute('data-listing-id');
        const userId = 1;

        try {
            const response = await fetch('/api/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ listingId: listingId, userId: userId })
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

document.getElementById('distance-range').addEventListener('input', (e) => {
    const radius = e.target.value;
    document.getElementById('range-value').innerText = radius;
    filterByDistance(radius);
});

listBtn.addEventListener('click', () => toggleView(false));
mapBtn.addEventListener('click', () => toggleView(true));

loadFeed();
getUserLocation();
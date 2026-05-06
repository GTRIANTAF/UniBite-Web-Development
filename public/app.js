const feedContainer = document.querySelector('#dynamic-feed');
const postButton = document.querySelector('.fab-post');

const listBtn = document.getElementById('list-view-btn');
const mapBtn = document.getElementById('map-view-btn');
const mapDiv = document.getElementById('map');
const feedDiv = document.getElementById('dynamic-feed');

const API_URL = '/api/listings';

function loadFeed() {
    feedContainer.innerHTML = '';

    fetch(API_URL)
        .then(res => res.json())
        .then(data => {
            if (data.length === 0) {
                feedContainer.innerHTML = '<h3>Δεν υπάρχουν διαθέσιμες αγγελίες.</h3>';
                return;
            }

            if (typeof markersLayer !== 'undefined') markersLayer.clearLayers();

            data.forEach(listing => {
                const id = listing.listing_id;
                const portions = listing.available_portions ?? 0;
                const isExhausted = portions <= 0;

                // List View
                const card = document.createElement('article');
                card.className = `food-card ${isExhausted ? 'noAvailability' : ''}`;

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
                    const lat = 38.2466 + (Math.random() - 0.5) * 0.01;
                    const lng = 21.7346 + (Math.random() - 0.5) * 0.01;

                    const marker = L.marker([lat, lng]);
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

postButton.addEventListener('click', function (e) {
    e.preventDefault();

    //dummy listing
    let newListing = {
        title: "Σπιτική Καρμπονάρα",
        portions: 2,
        description: "Φρέσκα μακαρόνια με αυθεντική ιταλική συνταγή.",
        pickup_location: "Εστιατόριο Βιβλιοθήκης",
        pickup_time: "2026-05-05 14:30:00"
    };

    console.log("Προσπάθεια δημιουργίας αγγελίας...");

    fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newListing)
    })
        .then(response => response.json())
        .then(data => {
            console.log('Η αγγελία δημιουργήθηκε:', data);
            loadFeed(); // load new listing
        })
        .catch(error => console.error("Σφάλμα στο POST:", error));
});

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

function formatPickupTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('el-GR', {
        dateStyle: 'short',
        timeStyle: 'short'
    });
}

loadFeed();

const map = L.map('map').setView([38.2466, 21.7346], 13);
const markersLayer = L.layerGroup().addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

function toggleView(showMap) {
    if (showMap) {
        // Εμφάνιση Χάρτη - Κρύψιμο Λίστας
        mapDiv.classList.remove('hidden-view');
        feedDiv.classList.add('hidden-view');

        mapBtn.classList.add('active');
        listBtn.classList.remove('active');

        setTimeout(() => { map.invalidateSize(); }, 100);
    } else {
        // Εμφάνιση Λίστας - Κρύψιμο Χάρτη
        mapDiv.classList.add('hidden-view');
        feedDiv.classList.remove('hidden-view');

        listBtn.classList.add('active');
        mapBtn.classList.remove('active');
    }
}

listBtn.addEventListener('click', () => toggleView(false));
mapBtn.addEventListener('click', () => toggleView(true));
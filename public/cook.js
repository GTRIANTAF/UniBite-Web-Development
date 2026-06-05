const listingForm = document.getElementById('listing-form');
const formMessage = document.getElementById('form-message');
const requestsContainer = document.getElementById('cook-requests-container');
const refreshRequestsBtn = document.getElementById('refresh-requests-btn');
const listingsContainer = document.getElementById('cook-listings-container');
const refreshListingsBtn = document.getElementById('refresh-listings-btn');
const submitListingBtn = document.getElementById('submit-listing-btn');
const cancelEditListingBtn = document.getElementById('cancel-edit-listing-btn');

const CURRENT_COOK_ID = localStorage.getItem('unibite_user_id');

if (!CURRENT_COOK_ID) {
    window.location.href = 'login.html';
}

//Map Logic
let map;
let marker;
let editingListingId = null;
let editingListingData = null;
const btnOpenMap = document.getElementById('btn-open-map');
const mapModal = document.getElementById('map-modal');
const closeMapModal = document.getElementById('close-map-modal');
const btnConfirmLocation = document.getElementById('btn-confirm-location');
const latitudeInput = document.getElementById('latitude');
const longitudeInput = document.getElementById('longitude');
const mapStatusText = document.getElementById('map-status-text');

function setLocationMarker(lat, lng, shouldCenter = false) {
    if (!map) return;

    if (marker) {
        map.removeLayer(marker);
    }

    marker = L.marker([lat, lng]).addTo(map);

    if (shouldCenter) {
        map.setView([lat, lng], 15);
    }
}

function initMap() {
    if (map) {
        map.invalidateSize();
        if (latitudeInput.value && longitudeInput.value) {
            setLocationMarker(parseFloat(latitudeInput.value), parseFloat(longitudeInput.value), true);
        }
        return;
    }

    map = L.map('location-picker-map').setView([38.2462, 21.7351], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    //Get user location for the cook map
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            map.setView([lat, lng], 14);

            const userIcon = L.divIcon({
                html: '<div class="pulsing-dot"></div>',
                className: '',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });

            L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 })
                .addTo(map)
                .bindPopup('Είσαι εδώ!');
        }, () => {
            console.log("Geolocation denied or failed.");
        });
    }

    map.on('click', function(e) {
        setLocationMarker(e.latlng.lat, e.latlng.lng);
        latitudeInput.value = e.latlng.lat;
        longitudeInput.value = e.latlng.lng;
    });

    if (latitudeInput.value && longitudeInput.value) {
        setLocationMarker(parseFloat(latitudeInput.value), parseFloat(longitudeInput.value), true);
    }
}

if (btnOpenMap) {
    btnOpenMap.addEventListener('click', () => {
        mapModal.style.display = 'flex';
        setTimeout(() => {
            initMap();
        }, 100);
    });
}

if (closeMapModal) {
    closeMapModal.addEventListener('click', () => {
        mapModal.style.display = 'none';
    });
}

if (btnConfirmLocation) {
    btnConfirmLocation.addEventListener('click', () => {
        if (latitudeInput.value && longitudeInput.value) {
            mapStatusText.textContent = `📍 Επιλέχθηκε: ${parseFloat(latitudeInput.value).toFixed(4)}, ${parseFloat(longitudeInput.value).toFixed(4)}`;
            mapStatusText.style.color = 'green';
            mapModal.style.display = 'none';
        } else {
            alert('Παρακαλώ κάνε κλικ στον χάρτη για να επιλέξεις σημείο.');
        }
    });
}

function showMessage(text, type) {
    formMessage.textContent = text;
    formMessage.className = `form-message ${type}`;
    formMessage.classList.remove('hidden-view');
}

function getSelectedAllergens() {
    const checkedAllergens = document.querySelectorAll('.allergen-grid input[type="checkbox"]:checked');
    return Array.from(checkedAllergens).map(item => item.value).join(', ');
}

function setSelectedAllergens(allergensText) {
    const selectedAllergens = (allergensText || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);

    document.querySelectorAll('.allergen-grid input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = selectedAllergens.includes(checkbox.value);
    });
}

function getListingStatusClass(listing) {
    if (listing.status === 'Inactive' || Number(listing.available_portions) <= 0) return 'completed';
    return 'approved';
}

function renderListingCard(listing) {
    const statusClass = getListingStatusClass(listing);
    const available = listing.available_portions ?? 0;
    const total = listing.total_portions ?? 0;
    const statusText = listing.status === 'Inactive' || Number(available) <= 0 ? 'Inactive' : 'Active';

    return `
        <article class="provider-request-card ${statusClass}">
            <div class="provider-request-header">
                <div>
                    <h3>${listing.title}</h3>
                    <p>${formatDate(listing.creation_timestamp)}</p>
                </div>
                <span class="provider-status-badge ${statusClass}">${statusText}</span>
            </div>

            <div class="provider-request-body listing-card-body">
                <p><strong>Τοποθεσία:</strong> ${listing.pickup_location || ''}</p>
                <p><strong>Ώρα:</strong> ${formatDate(listing.pickup_time)}</p>
                <p><strong>Μερίδες:</strong> ${available}/${total}</p>
            </div>

            <div class="provider-request-actions">
                <button class="provider-action-btn edit-listing" data-listing-id="${listing.listing_id}">
                    <span class="material-icons">edit</span>
                    Edit
                </button>

                <button class="provider-action-btn delete-listing" data-listing-id="${listing.listing_id}">
                    <span class="material-icons">delete</span>
                    Delete
                </button>
            </div>
        </article>
    `;
}

async function loadCookListings() {
    if (!listingsContainer) return;

    listingsContainer.innerHTML = '<p class="dashboard-empty">Φόρτωση αγγελιών...</p>';

    try {
        const response = await fetch(`/api/listings/cook/${CURRENT_COOK_ID}`);
        const listings = await response.json();

        if (!response.ok) {
            listingsContainer.innerHTML = `<p class="dashboard-empty error">${listings.error || 'Σφάλμα φόρτωσης αγγελιών.'}</p>`;
            return;
        }

        if (!listings || listings.length === 0) {
            listingsContainer.innerHTML = '<p class="dashboard-empty">Δεν έχεις δημιουργήσει αγγελίες ακόμα.</p>';
            return;
        }

        listingsContainer.innerHTML = listings.map(renderListingCard).join('');
    } catch (error) {
        console.error(error);
        listingsContainer.innerHTML = '<p class="dashboard-empty error">Υπήρξε πρόβλημα σύνδεσης με τον server.</p>';
    }
}

function resetListingFormMode() {
    editingListingId = null;
    editingListingData = null;
    listingForm.reset();

    if (marker && map) {
        map.removeLayer(marker);
        marker = null;
    }

    latitudeInput.value = '';
    longitudeInput.value = '';
    mapStatusText.textContent = '📍 Δεν έχει επιλεγεί τοποθεσία στον χάρτη';
    mapStatusText.style.color = '#666';

    if (submitListingBtn) {
        submitListingBtn.innerHTML = '<span class="material-icons">add_circle</span> Δημιουργία Αγγελίας';
    }

    if (cancelEditListingBtn) {
        cancelEditListingBtn.classList.add('hidden-view');
    }
}

function startEditListing(listing) {
    editingListingId = listing.listing_id;
    editingListingData = listing;

    document.getElementById('title').value = listing.title || '';
    document.getElementById('description').value = listing.description || '';
    document.getElementById('photo_url').value = listing.photo_url || '';
    document.getElementById('pickup_location').value = listing.pickup_location || '';
    document.getElementById('pickup_building').value = listing.pickup_building || '';
    document.getElementById('pickup_details').value = listing.pickup_details || '';
    document.getElementById('pickup_time').value = listing.pickup_time ? listing.pickup_time.slice(0, 16) : '';
    document.getElementById('total_portions').value = listing.total_portions || 1;
    latitudeInput.value = listing.latitude || '';
    longitudeInput.value = listing.longitude || '';
    setSelectedAllergens(listing.allergens);

    if (latitudeInput.value && longitudeInput.value) {
        mapStatusText.textContent = `📍 Επιλέχθηκε: ${parseFloat(latitudeInput.value).toFixed(4)}, ${parseFloat(longitudeInput.value).toFixed(4)}`;
        mapStatusText.style.color = 'green';
        setLocationMarker(parseFloat(latitudeInput.value), parseFloat(longitudeInput.value), true);
    }

    if (submitListingBtn) {
        submitListingBtn.innerHTML = '<span class="material-icons">save</span> Αποθήκευση Αλλαγών';
    }

    if (cancelEditListingBtn) {
        cancelEditListingBtn.classList.remove('hidden-view');
    }

    document.getElementById('kitchen-view').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function deleteCookListing(listingId) {
    const confirmDelete = confirm('Είσαι σίγουρος ότι θέλεις να διαγράψεις αυτή την αγγελία;');

    if (!confirmDelete) return;

    try {
        const response = await fetch(`/api/listings/${listingId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cook_id: Number(CURRENT_COOK_ID)
            })
        });

        const result = await response.json();

        if (!response.ok) {
            alert(result.error || 'Η διαγραφή απέτυχε.');
            return;
        }

        alert(result.message || 'Η αγγελία διαγράφηκε.');
        if (String(editingListingId) === String(listingId)) {
            resetListingFormMode();
        }
        loadCookListings();
        loadCookRequests();
    } catch (error) {
        console.error(error);
        alert('Υπήρξε πρόβλημα σύνδεσης με τον server.');
    }
}



function getRequestStatusText(request) {
    if (request.status === 'Pending') return 'Σε αναμονή';
    if (request.status === 'Rejected') return 'Απορρίφθηκε';

    if (request.status === 'Approved' && request.delivery_status === 'Pending') {
        return 'Εγκρίθηκε';
    }

    if (request.status === 'Approved' && request.delivery_status === 'Picked_Up') {
        return 'Παραλήφθηκε';
    }

    if (request.status === 'Approved' && request.delivery_status === 'No_Show') {
        return 'Δεν παραλήφθηκε';
    }

    return request.status || 'Άγνωστη κατάσταση';
}

function getRequestStatusClass(request) {
    if (request.status === 'Pending') return 'pending';
    if (request.status === 'Rejected') return 'rejected';

    if (request.status === 'Approved' && request.delivery_status === 'Picked_Up') {
        return 'completed';
    }

    if (request.status === 'Approved' && request.delivery_status === 'No_Show') {
        return 'rejected';
    }

    if (request.status === 'Approved') return 'approved';

    return 'pending';
}

function renderRequestCard(request) {
    const requestId = request.request_id;
    const statusClass = getRequestStatusClass(request);
    const statusText = getRequestStatusText(request);
    const consumerName = request.consumer_username || request.consumer || request.username || `Χρήστης #${request.consumer_id}`;

    const canApproveOrReject = request.status === 'Pending';
    const canMarkDelivery = request.status === 'Approved' && request.delivery_status === 'Pending';

    return `
        <article class="provider-request-card ${statusClass}">
            <div class="provider-request-header">
                <div>
                    <h3>${request.title}</h3>
                    <p>${formatDate(request.creation_timestamp || request.date)}</p>
                </div>
                <span class="provider-status-badge ${statusClass}">${statusText}</span>
            </div>

            <div class="provider-request-body">
                <p><strong>Φοιτητής:</strong> ${consumerName}</p>
                <p><strong>Παραλαβή:</strong> ${request.pickup_location || ''}</p>
                <p><strong>Ώρα:</strong> ${formatDate(request.pickup_time)}</p>
            </div>

            <div class="provider-request-actions">
                ${canApproveOrReject ? `
                    <button class="provider-action-btn approve" data-request-id="${requestId}" data-action="approve">
                        <span class="material-icons">check_circle</span>
                        Approve
                    </button>

                    <button class="provider-action-btn reject" data-request-id="${requestId}" data-action="reject">
                        <span class="material-icons">cancel</span>
                        Reject
                    </button>
                ` : ''}

                ${canMarkDelivery ? `
                    <button class="provider-action-btn complete" data-request-id="${requestId}" data-action="picked-up">
                        <span class="material-icons">done_all</span>
                        Picked Up
                    </button>

                    <button class="provider-action-btn no-show" data-request-id="${requestId}" data-action="no-show">
                        <span class="material-icons">person_off</span>
                        No Show
                    </button>
                ` : ''}
            </div>
        </article>
    `;
}

async function loadCookRequests() {
    if (!requestsContainer) return;

    requestsContainer.innerHTML = '<p class="dashboard-empty">Φόρτωση αιτημάτων...</p>';

    try {
        const response = await fetch(`/api/requests/cook/${CURRENT_COOK_ID}`);
        const requests = await response.json();

        if (!response.ok) {
            requestsContainer.innerHTML = `<p class="dashboard-empty error">${requests.error || 'Σφάλμα φόρτωσης αιτημάτων.'}</p>`;
            return;
        }

        if (!requests || requests.length === 0) {
            requestsContainer.innerHTML = '<p class="dashboard-empty">Δεν υπάρχουν αιτήματα ακόμα.</p>';
            return;
        }

        requestsContainer.innerHTML = requests.map(renderRequestCard).join('');
    } catch (error) {
        console.error(error);
        requestsContainer.innerHTML = '<p class="dashboard-empty error">Υπήρξε πρόβλημα σύνδεσης με τον server.</p>';
    }
}

async function updateRequestStatus(requestId, action) {
    const actionEndpoints = {
        approve: `/api/requests/${requestId}/approve`,
        reject: `/api/requests/${requestId}/reject`,
        'picked-up': `/api/requests/${requestId}/picked-up`,
        'no-show': `/api/requests/${requestId}/no-show`
    };

    const endpoint = actionEndpoints[action];

    if (!endpoint) return;

    try {
        const response = await fetch(endpoint, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cook_id: Number(CURRENT_COOK_ID)
            })
        });

        const result = await response.json();

        if (!response.ok) {
            alert(result.error || 'Η ενέργεια απέτυχε.');
            return;
        }

        alert(result.message || 'Η ενέργεια ολοκληρώθηκε.');
        loadCookRequests();
    } catch (error) {
        console.error(error);
        alert('Υπήρξε πρόβλημα σύνδεσης με τον server.');
    }
}

listingForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const lat = document.getElementById('latitude').value;
    const lng = document.getElementById('longitude').value;

    if (!lat || !lng) {
        showMessage('Παρακαλώ επίλεξε τοποθεσία στον χάρτη.', 'error');
        return;
    }

    const totalPortions = Number(document.getElementById('total_portions').value);
    let availablePortions = totalPortions;

    if (editingListingData) {
        const reservedPortions = Number(editingListingData.total_portions || 0) - Number(editingListingData.available_portions || 0);
        availablePortions = Math.max(totalPortions - reservedPortions, 0);
    }

    const listingData = {
        cook_id: Number(CURRENT_COOK_ID),
        title: document.getElementById('title').value.trim(),
        description: document.getElementById('description').value.trim(),
        photo_url: document.getElementById('photo_url').value.trim(),
        allergens: getSelectedAllergens(),
        pickup_location: document.getElementById('pickup_location').value.trim(),
        pickup_building: document.getElementById('pickup_building').value.trim(),
        pickup_details: document.getElementById('pickup_details').value.trim(),
        pickup_time: document.getElementById('pickup_time').value,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        total_portions: totalPortions
    };

    if (editingListingId) {
        listingData.available_portions = availablePortions;
        listingData.status = availablePortions > 0 ? 'Active' : 'Inactive';
    }

    try {
        const endpoint = editingListingId ? `/api/listings/${editingListingId}` : '/api/listings';
        const method = editingListingId ? 'PUT' : 'POST';

        const response = await fetch(endpoint, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(listingData)
        });

        const result = await response.json();

        if (!response.ok) {
            showMessage(result.error || 'Η αποθήκευση αγγελίας απέτυχε.', 'error');
            return;
        }

        showMessage(editingListingId ? 'Η αγγελία ενημερώθηκε επιτυχώς.' : 'Η αγγελία δημιουργήθηκε επιτυχώς.', 'success');
        resetListingFormMode();
        loadCookListings();
        loadCookRequests();
    } catch (error) {
        console.error(error);
        showMessage('Υπήρξε πρόβλημα σύνδεσης με τον server.', 'error');
    }
});

if (requestsContainer) {
    requestsContainer.addEventListener('click', (event) => {
        const actionButton = event.target.closest('.provider-action-btn');

        if (!actionButton) return;

        const requestId = actionButton.getAttribute('data-request-id');
        const action = actionButton.getAttribute('data-action');

        updateRequestStatus(requestId, action);
    });
}

if (listingsContainer) {
    listingsContainer.addEventListener('click', async (event) => {
        const editButton = event.target.closest('.edit-listing');
        const deleteButton = event.target.closest('.delete-listing');

        if (editButton) {
            const listingId = editButton.getAttribute('data-listing-id');

            try {
                const response = await fetch(`/api/listings/${listingId}`);
                const listing = await response.json();

                if (!response.ok) {
                    alert(listing.error || 'Δεν βρέθηκε η αγγελία.');
                    return;
                }

                startEditListing(listing);
            } catch (error) {
                console.error(error);
                alert('Υπήρξε πρόβλημα σύνδεσης με τον server.');
            }

            return;
        }

        if (deleteButton) {
            const listingId = deleteButton.getAttribute('data-listing-id');
            deleteCookListing(listingId);
        }
    });
}

if (refreshRequestsBtn) {
    refreshRequestsBtn.addEventListener('click', loadCookRequests);
}

if (refreshListingsBtn) {
    refreshListingsBtn.addEventListener('click', loadCookListings);
}

if (cancelEditListingBtn) {
    cancelEditListingBtn.addEventListener('click', resetListingFormMode);
}

// --- Navigation & Profile Logic ---
function switchView(viewName) {
    document.getElementById('kitchen-view').classList.add('hidden-view');
    document.getElementById('requests-view').classList.add('hidden-view');
    document.getElementById('profile-view').classList.add('hidden-view');

    document.getElementById('nav-kitchen').classList.remove('active');
    document.getElementById('nav-requests').classList.remove('active');
    document.getElementById('nav-profile').classList.remove('active');

    if (viewName === 'kitchen') {
        document.getElementById('kitchen-view').classList.remove('hidden-view');
        document.getElementById('nav-kitchen').classList.add('active');
        loadCookListings();
    } else if (viewName === 'requests') {
        document.getElementById('requests-view').classList.remove('hidden-view');
        document.getElementById('nav-requests').classList.add('active');
        loadCookRequests();
    } else if (viewName === 'profile') {
        document.getElementById('profile-view').classList.remove('hidden-view');
        document.getElementById('nav-profile').classList.add('active');
        loadProfileData();
    }
}

async function loadProfileData() {
    try {
        const response = await fetch(`/api/users/${CURRENT_COOK_ID}`);
        if (!response.ok) throw new Error('Failed to load profile');
        const user = await response.json();

        document.getElementById('profile-name').textContent = user.username;
        document.getElementById('profile-email').textContent = user.email;
        document.getElementById('profile-points').textContent = user.points;
    } catch (err) {
        console.error(err);
        document.getElementById('profile-name').textContent = 'Σφάλμα φόρτωσης';
    }
}

document.getElementById('btn-become-consumer').addEventListener('click', () => {
    window.location.href = 'consumer.html';
});

document.getElementById('btn-logout').addEventListener('click', () => {
    const confirmLogout = confirm('Είσαι σίγουρος ότι θέλεις να αποσυνδεθείς;');

    if (confirmLogout) {
        localStorage.removeItem('unibite_token');
        localStorage.removeItem('unibite_user_id');
        localStorage.removeItem('unibite_is_admin');
        localStorage.removeItem('unibite_role');

        window.location.href = '/';
    }
});

loadCookListings();
loadCookRequests();

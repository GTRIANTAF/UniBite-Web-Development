const listingForm = document.getElementById('listing-form');
const formMessage = document.getElementById('form-message');
const requestsContainer = document.getElementById('cook-requests-container');
const refreshRequestsBtn = document.getElementById('refresh-requests-btn');

const CURRENT_COOK_ID = localStorage.getItem('unibite_user_id');

if (!CURRENT_COOK_ID) {
    window.location.href = 'login.html';
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

function formatDate(dateString) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return 'Άγνωστη ώρα';
    }

    return date.toLocaleString('el-GR', {
        dateStyle: 'short',
        timeStyle: 'short'
    });
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
        total_portions: Number(document.getElementById('total_portions').value)
    };

    try {
        const response = await fetch('/api/listings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(listingData)
        });

        const result = await response.json();

        if (!response.ok) {
            showMessage(result.error || 'Η δημιουργία αγγελίας απέτυχε.', 'error');
            return;
        }

        showMessage('Η αγγελία δημιουργήθηκε επιτυχώς.', 'success');
        listingForm.reset();
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

if (refreshRequestsBtn) {
    refreshRequestsBtn.addEventListener('click', loadCookRequests);
}

loadCookRequests();

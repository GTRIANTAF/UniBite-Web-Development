const ADMIN_ID = localStorage.getItem('unibite_user_id');

const monthInput = document.getElementById('admin-month');
const refreshButton = document.getElementById('refresh-admin-btn');
const adminMessage = document.getElementById('admin-message');

if (!ADMIN_ID) {
    window.location.href = 'login.html';
}

function showAdminMessage(text, type = 'error') {
    adminMessage.textContent = text;
    adminMessage.className = `form-message ${type}`;
    adminMessage.classList.remove('hidden-view');
}

function hideAdminMessage() {
    adminMessage.classList.add('hidden-view');
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value ?? 0;
    }
}

function getCurrentMonth() {
    return new Date().toISOString().slice(0, 7);
}

function setDefaultMonth() {
    if (!monthInput.value) {
        monthInput.value = getCurrentMonth();
    }
}

async function fetchJson(url) {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Σφάλμα φόρτωσης δεδομένων.');
    }

    return data;
}

function renderEmptyTable(tbodyId, colspan, message) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = `<tr><td colspan="${colspan}">${message}</td></tr>`;
}

function renderTopDonors(rows) {
    const tbody = document.getElementById('top-donors-body');

    if (!rows || rows.length === 0) {
        renderEmptyTable('top-donors-body', 4, 'Δεν υπάρχουν δεδομένα.');
        return;
    }

    tbody.innerHTML = rows.map((row, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>
                <strong>${row.username}</strong>
                <span>${row.email || ''}</span>
            </td>
            <td>${row.donated_portions || 0}</td>
            <td>${row.successful_listings || 0}</td>
        </tr>
    `).join('');
}

function renderHighestRated(rows) {
    const tbody = document.getElementById('highest-rated-body');

    if (!rows || rows.length === 0) {
        renderEmptyTable('highest-rated-body', 4, 'Δεν υπάρχουν δεδομένα.');
        return;
    }

    tbody.innerHTML = rows.map((row, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>
                <strong>${row.username}</strong>
                <span>${row.email || ''}</span>
            </td>
            <td>${row.average_rating || 0}</td>
            <td>${row.total_ratings || 0}</td>
        </tr>
    `).join('');
}

function renderStats(stats) {
    setText('stat-users', stats.total_users);
    setText('stat-listings', stats.total_listings);
    setText('stat-portions', stats.total_portions_posted);
    setText('stat-rating', stats.average_rating);

    setText('stat-requests', stats.total_requests);
    setText('stat-pending', stats.pending_requests);
    setText('stat-approved', stats.approved_requests);
    setText('stat-rejected', stats.rejected_requests);
    setText('stat-picked-up', stats.picked_up_requests);
    setText('stat-no-show', stats.no_show_requests);

    setText('stat-active-listings', stats.active_listings);
    setText('stat-inactive-listings', stats.inactive_listings);
    setText('stat-deleted-listings', stats.deleted_listings);
    setText('stat-reserved-portions', stats.reserved_portions);
    setText('stat-ratings', stats.total_ratings);
    setText('stat-bonus-ratings', stats.bonus_ratings);
}

async function loadAdminDashboard() {
    hideAdminMessage();
    setDefaultMonth();

    const month = monthInput.value;

    try {
        const statsData = await fetchJson(`/api/admin/stats/monthly?admin_id=${ADMIN_ID}&month=${month}`);
        const topDonors = await fetchJson(`/api/admin/leaderboard/top-donors?admin_id=${ADMIN_ID}&limit=10`);
        const highestRated = await fetchJson(`/api/admin/leaderboard/highest-rated?admin_id=${ADMIN_ID}&limit=10`);

        renderStats(statsData.stats);
        renderTopDonors(topDonors);
        renderHighestRated(highestRated);
    } catch (error) {
        console.error(error);

        showAdminMessage(error.message);

        if (error.message === 'Admin access required') {
            setTimeout(() => {
                window.location.href = 'start.html';
            }, 1200);
        }
    }
}

refreshButton.addEventListener('click', loadAdminDashboard);
monthInput.addEventListener('change', loadAdminDashboard);

setDefaultMonth();
loadAdminDashboard();

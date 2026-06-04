//Shared Utility Functions for UniBite

//Formats a Date string into a localized Greek short string (DD/MM/YYYY, HH:MM)./
function formatPickupTime(dateString) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return 'Άγνωστη ώρα';
    }

    return date.toLocaleString('el-GR', {
        dateStyle: 'short',
        timeStyle: 'short'
    });
}


//Alias for formatPickupTime for backward compatibility in cook.js
const formatDate = formatPickupTime;


//Creates and returns a standard pulsing dot Leaflet Icon for user geolocation.
function createUserIcon(L) {
    return L.divIcon({
        html: '<div class="pulsing-dot"></div>',
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });
}

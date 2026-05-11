const listingForm = document.getElementById('listing-form');
const formMessage = document.getElementById('form-message');

const COOK_ID = 1;

function showMessage(text, type) {
    formMessage.textContent = text;
    formMessage.className = `form-message ${type}`;
}

function getSelectedAllergens() {
    const checkedAllergens = document.querySelectorAll('.allergen-grid input[type="checkbox"]:checked');
    return Array.from(checkedAllergens).map(item => item.value).join(', ');
}

listingForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const listingData = {
        cook_id: COOK_ID,
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

    } catch (error) {
        console.error(error);
        showMessage('Υπήρξε πρόβλημα σύνδεσης με τον server.', 'error');
    }
});

const express = require('express');
const path = require('path');
const db = require('./database_connection'); // Εισαγωγή της σύνδεσης που τεστάραμε

const app = express();
const PORT = 3000;

// Middleware για Express
app.use(express.static(path.join(__dirname, '../public')));

// --- 1. GET Request: Φέρε όλες τις αγγελίες ---
app.get('/api/listings', (req, res) => {
    const query = 'SELECT * FROM Food_Posting WHERE creation_timestamp > NOW() - INTERVAL 48 HOUR';

    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results); // Επιστρέφει τα δεδομένα σε μορφή JSON
    });
});

app.listen(PORT, () => {
    console.log(`Ο server τρέχει στο http://localhost:${PORT}`);
});
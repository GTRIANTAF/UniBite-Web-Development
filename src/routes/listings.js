const express = require('express');
const router = express.Router();
const db = require('../database_connection');

router.get('/', (req, res) => {
    const query = 'SELECT * FROM Listing WHERE creation_timestamp > NOW() - INTERVAL 48 HOUR';

    db.query(query, (err, results) => {
        if (err) {
            console.error("Σφάλμα SQL:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

router.post('/', (req, res) => {
    const { title, portions, description, pickup_location, pickup_time } = req.body;

    const query = `
        INSERT INTO Listing (title, available_portions, description, pickup_location, pickup_time) 
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(query, [title, portions, description, pickup_location, pickup_time], (err, results) => {
        if (err) {
            console.error("Σφάλμα SQL:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Η αγγελία δημιουργήθηκε!", id: results.insertId });
    });
});

module.exports = router;
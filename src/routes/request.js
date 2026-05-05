const express = require('express');
const router = express.Router();
const db = require('../database_connection');

router.post('/', (req, res) => {
    const { listingId, userId } = req.body;

    // Check if the user has enough points
    const userPoints = `SELECT points FROM User WHERE user_id = ?`;

    db.query(userPoints, [userId], (err, userResults) => {
        if (err) return res.status(500).json({ error: "Database error" });

        if (userResults.length === 0 || userResults[0].points < 1) {
            return res.status(403).json({ error: "Not enough points" });
        }

        // Check if the listing is available
        const listingAvailability = `SELECT available_portions FROM Listing WHERE listing_id = ?`;

        db.query(listingAvailability, [listingId], (err, listingAvailability) => {
            if (err) return res.status(500).json({ error: "Database error" });

            // Αν οι μερίδες είναι 0 ή λιγότερες
            if (listingAvailability.length === 0 || listingAvailability[0].available_portions <= 0) {
                return res.status(403).json({ error: "Listing is no longer available" });
            }

            const insertQuery = `
                INSERT INTO Request (listing_id, consumer_id)
                VALUES (?, ?)
            `;

            db.query(insertQuery, [listingId, userId], (err, result) => {
                if (err) return res.status(500).json({ error: "Could not create request" });

                // Επιτυχία! Ενημερώνουμε το frontend
                res.status(201).json({ message: "Request sent! Waiting for cook's approval." });
            });
        });
    });
});

module.exports = router;
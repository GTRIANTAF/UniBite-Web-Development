const express = require('express');
const router = express.Router();
const db = require('../database_connection');

router.post('/', (req, res) => {
    const { listingId, userId } = req.body;

    // 1. Έλεγχος πόντων χρήστη
    const userPointsQuery = `SELECT points FROM User WHERE user_id = ?`;

    db.query(userPointsQuery, [userId], (err, userResults) => {
        if (err) return res.status(500).json({ error: "Database error (User)" });

        if (userResults.length === 0 || userResults[0].points < 1) {
            return res.status(403).json({ error: "Δεν έχεις αρκετούς πόντους!" });
        }

        // 2. Έλεγχος διαθεσιμότητας αγγελίας
        const checkListingQuery = `SELECT available_portions FROM Listing WHERE listing_id = ?`;

        db.query(checkListingQuery, [listingId], (err, listingResults) => {
            if (err) return res.status(500).json({ error: "Database error (Listing)" });

            // ΠΡΩΤΑ ΕΛΕΓΧΟΥΜΕ ΑΝ ΥΠΑΡΧΕΙ Η ΑΓΓΕΛΙΑ
            if (!listingResults || listingResults.length === 0) {
                return res.status(404).json({ error: "Η αγγελία δεν βρέθηκε στη βάση." });
            }

            // ΜΕΤΑ ΕΛΕΓΧΟΥΜΕ ΤΙΣ ΜΕΡΙΔΕΣ
            const portions = listingResults[0].available_portions;
            if (portions === null || portions <= 0) {
                return res.status(400).json({ error: "Το φαγητό εξαντλήθηκε!" });
            }

            // 3. Δημιουργία Request
            const insertQuery = `INSERT INTO Request (listing_id, consumer_id) VALUES (?, ?)`;

            db.query(insertQuery, [listingId, userId], (err, result) => {
                if (err) return res.status(500).json({ error: "Αποτυχία δημιουργίας αιτήματος." });

                res.status(201).json({ message: "Το αίτημα στάλθηκε επιτυχώς!" });
            });
        });
    });
});

module.exports = router;
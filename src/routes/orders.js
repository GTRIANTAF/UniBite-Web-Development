const express = require('express');
const router = express.Router();
const db = require('../database_connection');

router.get('/', (req, res) => {
    const query = 'SELECT * FROM Request JOIN Listing ON Request.listing_id = food_Posting.listing_id';

    db.query(query, (err, results) => {
        if (err) {
            console.error("Σφάλμα SQL:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

module.exports = router;
const express = require('express');
const router = express.Router();
const db = require('../database_connection');

router.get('/', (req, res) => {
    const userId = Number(req.query.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Invalid user id' });
    }

    const query = `
        SELECT
            r.request_id AS id,
            r.request_id,
            r.creation_timestamp AS date,
            r.status,
            r.delivery_status,
            l.title,
            l.pickup_location,
            u.username AS cook,
            CASE
                WHEN r.status = 'Pending' THEN 'pending'
                WHEN r.status = 'Approved' AND r.delivery_status = 'Pending' THEN 'approved'
                WHEN r.status = 'Approved' AND r.delivery_status = 'Picked_Up' THEN 'completed'
                WHEN r.status = 'Approved' AND r.delivery_status = 'No_Show' THEN 'rejected'
                WHEN r.status = 'Rejected' THEN 'rejected'
                ELSE 'pending'
            END AS statusClass,
            CASE
                WHEN r.status = 'Pending' THEN 'Σε αναμονή'
                WHEN r.status = 'Approved' AND r.delivery_status = 'Pending' THEN 'Εγκρίθηκε'
                WHEN r.status = 'Approved' AND r.delivery_status = 'Picked_Up' THEN 'Παραλήφθηκε'
                WHEN r.status = 'Approved' AND r.delivery_status = 'No_Show' THEN 'Δεν παραλήφθηκε'
                WHEN r.status = 'Rejected' THEN 'Απορρίφθηκε'
                ELSE 'Σε αναμονή'
            END AS statusText,
            CASE
                WHEN r.status = 'Approved'
                 AND r.delivery_status = 'Picked_Up'
                 AND rating.rating_id IS NULL
                THEN 1
                ELSE 0
            END AS needsReview
        FROM Request r
        INNER JOIN Listing l ON r.listing_id = l.listing_id
        INNER JOIN User u ON l.cook_id = u.user_id
        LEFT JOIN Rating rating ON r.request_id = rating.request_id
        WHERE r.consumer_id = ?
        ORDER BY r.creation_timestamp DESC
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Σφάλμα SQL:', err);
            return res.status(500).json({ error: err.message });
        }

        res.json(results);
    });
});

module.exports = router;

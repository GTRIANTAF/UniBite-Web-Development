const express = require('express');
const router = express.Router();
const db = require('../database_connection');

router.get('/', (req, res) => {
    const userId = req.query.userId || 2;

    const query = `
        SELECT
            r.request_id AS id,
            l.title AS title,
            c.username AS cook,
            l.pickup_time AS date,
            r.delivery_status,
            rt.rating_id
        FROM Request r
            JOIN Listing l ON r.listing_id = l.listing_id
            JOIN User c ON l.cook_id = c.user_id
            LEFT JOIN Rating rt ON r.request_id = rt.request_id
        WHERE r.consumer_id = ?
        ORDER BY r.creation_timestamp DESC;
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error("Σφάλμα SQL:", err);
            return res.status(500).json({ error: err.message });
        }

        const formattedOrders = results.map(order => {
            let statusText = '';
            let statusClass = '';
            let needsReview = 0;

            if (order.delivery_status === 'Pending') {
                statusText = 'Αναμένεται Παραλαβή';
                statusClass = 'pending';
            }
            else if (order.delivery_status === 'Picked_Up') {
                statusText = 'Ολοκληρώθηκε';
                statusClass = 'completed';

                if (order.rating_id === null) {
                    needsReview = 1;
                }
            }
            else if (order.delivery_status === 'No_Show') {
                statusText = 'Ακυρώθηκε / Μη Εμφάνιση';
                statusClass = 'pending';
            }
            return {
                id: order.id,
                title: order.title,
                cook: order.cook,
                date: order.date,
                statusText: statusText,
                statusClass: statusClass,
                needsReview: needsReview
            };
        });
            res.json(formattedOrders);
    });
});

module.exports = router;
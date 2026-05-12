const express = require('express');
const router = express.Router();
const db = require('../database_connection');

// GET /api/users/:id
router.get('/:id', (req, res) => {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Invalid user id' });
    }

    const query = `SELECT username, email, points, is_admin FROM User WHERE user_id = ?`;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(results[0]);
    });
});

module.exports = router;
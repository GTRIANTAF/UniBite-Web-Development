const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database_connection');

const JWT_SECRET = 'unibite_super_secret_key_2024';

// REGISTER
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = `INSERT INTO User (username, email, password_hash) VALUES (?, ?, ?)`;

        db.query(query, [username, email, hashedPassword], (err, result) => {
            if (err) {
                return res.status(500).json({
                    error: 'Email already exists or DB error'
                });
            }

            res.status(201).json({
                message: 'User created!'
            });
        });
    } catch (error) {
        res.status(500).json({
            error: 'Server error'
        });
    }
});

// LOGIN
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    const query = `SELECT * FROM User WHERE email = ?`;

    db.query(query, [email], async (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        const token = jwt.sign(
            { userId: user.user_id },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.user_id,
                username: user.username,
                points: user.points,
                is_admin: user.is_admin
            }
        });
    });
});

module.exports = router;

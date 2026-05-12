const express = require('express');
const router = express.Router();
const db = require('../database_connection');

function isPositiveInteger(value) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0;
}

function isValidMonth(value) {
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function requireAdmin(req, res, next) {
    const adminId = Number(req.query.admin_id || (req.body && req.body.admin_id));

    if (!isPositiveInteger(adminId)) {
        return res.status(400).json({
            error: 'Invalid admin id'
        });
    }

    const query = `
    SELECT user_id
    FROM User
    WHERE user_id = ?
      AND is_admin = TRUE
  `;

    db.query(query, [adminId], (err, results) => {
        if (err) {
            return res.status(500).json({
                error: 'Database error',
                details: err.message
            });
        }

        if (results.length === 0) {
            return res.status(403).json({
                error: 'Admin access required'
            });
        }

        next();
    });
}

// GET monthly platform statistics
router.get('/stats/monthly', requireAdmin, (req, res) => {
    const month = req.query.month;

    if (!month || !isValidMonth(month)) {
        return res.status(400).json({
            error: 'Month must be provided in YYYY-MM format'
        });
    }

    const monthStart = `${month}-01`;

    const query = `
    SELECT
      (SELECT COUNT(*) FROM User) AS total_users,

      (
        SELECT COUNT(*)
        FROM Listing
        WHERE creation_timestamp >= ?
          AND creation_timestamp < DATE_ADD(?, INTERVAL 1 MONTH)
      ) AS total_listings,

      (
        SELECT COUNT(*)
        FROM Listing
        WHERE status = 'Active'
          AND creation_timestamp >= ?
          AND creation_timestamp < DATE_ADD(?, INTERVAL 1 MONTH)
      ) AS active_listings,

      (
        SELECT COUNT(*)
        FROM Listing
        WHERE status = 'Inactive'
          AND creation_timestamp >= ?
          AND creation_timestamp < DATE_ADD(?, INTERVAL 1 MONTH)
      ) AS inactive_listings,

      (
        SELECT COUNT(*)
        FROM Listing
        WHERE status = 'Deleted'
          AND creation_timestamp >= ?
          AND creation_timestamp < DATE_ADD(?, INTERVAL 1 MONTH)
      ) AS deleted_listings,

      (
        SELECT COALESCE(SUM(total_portions), 0)
        FROM Listing
        WHERE creation_timestamp >= ?
          AND creation_timestamp < DATE_ADD(?, INTERVAL 1 MONTH)
      ) AS total_portions_posted,

      (
        SELECT COALESCE(SUM(total_portions - available_portions), 0)
        FROM Listing
        WHERE creation_timestamp >= ?
          AND creation_timestamp < DATE_ADD(?, INTERVAL 1 MONTH)
      ) AS reserved_portions,

      (
        SELECT COUNT(*)
        FROM Request
        WHERE creation_timestamp >= ?
          AND creation_timestamp < DATE_ADD(?, INTERVAL 1 MONTH)
      ) AS total_requests,

      (
        SELECT COUNT(*)
        FROM Request
        WHERE status = 'Pending'
          AND creation_timestamp >= ?
          AND creation_timestamp < DATE_ADD(?, INTERVAL 1 MONTH)
      ) AS pending_requests,

      (
        SELECT COUNT(*)
        FROM Request
        WHERE status = 'Approved'
          AND creation_timestamp >= ?
          AND creation_timestamp < DATE_ADD(?, INTERVAL 1 MONTH)
      ) AS approved_requests,

      (
        SELECT COUNT(*)
        FROM Request
        WHERE status = 'Rejected'
          AND creation_timestamp >= ?
          AND creation_timestamp < DATE_ADD(?, INTERVAL 1 MONTH)
      ) AS rejected_requests,

      (
        SELECT COUNT(*)
        FROM Request
        WHERE delivery_status = 'Picked_Up'
          AND creation_timestamp >= ?
          AND creation_timestamp < DATE_ADD(?, INTERVAL 1 MONTH)
      ) AS picked_up_requests,

      (
        SELECT COUNT(*)
        FROM Request
        WHERE delivery_status = 'No_Show'
          AND creation_timestamp >= ?
          AND creation_timestamp < DATE_ADD(?, INTERVAL 1 MONTH)
      ) AS no_show_requests,

      (
        SELECT COUNT(*)
        FROM Rating
        WHERE rated_at >= ?
          AND rated_at < DATE_ADD(?, INTERVAL 1 MONTH)
      ) AS total_ratings,

      (
        SELECT COALESCE(ROUND(AVG(CAST(score AS UNSIGNED)), 2), 0)
        FROM Rating
        WHERE rated_at >= ?
          AND rated_at < DATE_ADD(?, INTERVAL 1 MONTH)
      ) AS average_rating,

      (
        SELECT COUNT(*)
        FROM Rating
        WHERE bonus_awarded = TRUE
          AND rated_at >= ?
          AND rated_at < DATE_ADD(?, INTERVAL 1 MONTH)
      ) AS bonus_ratings
  `;

    const params = [
        monthStart, monthStart,
        monthStart, monthStart,
        monthStart, monthStart,
        monthStart, monthStart,
        monthStart, monthStart,
        monthStart, monthStart,
        monthStart, monthStart,
        monthStart, monthStart,
        monthStart, monthStart,
        monthStart, monthStart,
        monthStart, monthStart,
        monthStart, monthStart,
        monthStart, monthStart,
        monthStart, monthStart,
        monthStart, monthStart
    ];

    db.query(query, params, (err, results) => {
        if (err) {
            return res.status(500).json({
                error: 'Database error',
                details: err.message
            });
        }

        res.json({
            month,
            stats: results[0]
        });
    });
});

// GET top donors leaderboard
router.get('/leaderboard/top-donors', requireAdmin, (req, res) => {
    const limit = Number(req.query.limit || 10);

    if (!isPositiveInteger(limit)) {
        return res.status(400).json({
            error: 'Invalid limit'
        });
    }

    const query = `
    SELECT
      u.user_id,
      u.username,
      u.email,
      COUNT(r.request_id) AS donated_portions,
      COUNT(DISTINCT l.listing_id) AS successful_listings
    FROM User u
    INNER JOIN Listing l ON u.user_id = l.cook_id
    INNER JOIN Request r ON l.listing_id = r.listing_id
    WHERE r.status = 'Approved'
      AND r.delivery_status = 'Picked_Up'
    GROUP BY u.user_id, u.username, u.email
    ORDER BY donated_portions DESC, successful_listings DESC, u.username ASC
    LIMIT ?
  `;

    db.query(query, [limit], (err, results) => {
        if (err) {
            return res.status(500).json({
                error: 'Database error',
                details: err.message
            });
        }

        res.json(results);
    });
});

// GET highest rated cooks leaderboard
router.get('/leaderboard/highest-rated', requireAdmin, (req, res) => {
    const limit = Number(req.query.limit || 10);

    if (!isPositiveInteger(limit)) {
        return res.status(400).json({
            error: 'Invalid limit'
        });
    }

    const query = `
    SELECT
      u.user_id,
      u.username,
      u.email,
      ROUND(AVG(CAST(rating.score AS UNSIGNED)), 2) AS average_rating,
      COUNT(rating.rating_id) AS total_ratings,
      SUM(CASE WHEN rating.bonus_awarded = TRUE THEN 1 ELSE 0 END) AS bonus_ratings
    FROM User u
    INNER JOIN Listing l ON u.user_id = l.cook_id
    INNER JOIN Request r ON l.listing_id = r.listing_id
    INNER JOIN Rating rating ON r.request_id = rating.request_id
    GROUP BY u.user_id, u.username, u.email
    ORDER BY average_rating DESC, total_ratings DESC, u.username ASC
    LIMIT ?
  `;

    db.query(query, [limit], (err, results) => {
        if (err) {
            return res.status(500).json({
                error: 'Database error',
                details: err.message
            });
        }

        res.json(results);
    });
});

// GET combined leaderboard
router.get('/leaderboard', requireAdmin, (req, res) => {
    const limit = Number(req.query.limit || 10);

    if (!isPositiveInteger(limit)) {
        return res.status(400).json({
            error: 'Invalid limit'
        });
    }

    const topDonorsQuery = `
    SELECT
      u.user_id,
      u.username,
      COUNT(r.request_id) AS donated_portions,
      COUNT(DISTINCT l.listing_id) AS successful_listings
    FROM User u
    INNER JOIN Listing l ON u.user_id = l.cook_id
    INNER JOIN Request r ON l.listing_id = r.listing_id
    WHERE r.status = 'Approved'
      AND r.delivery_status = 'Picked_Up'
    GROUP BY u.user_id, u.username
    ORDER BY donated_portions DESC, successful_listings DESC, u.username ASC
    LIMIT ?
  `;

    const highestRatedQuery = `
    SELECT
      u.user_id,
      u.username,
      ROUND(AVG(CAST(rating.score AS UNSIGNED)), 2) AS average_rating,
      COUNT(rating.rating_id) AS total_ratings
    FROM User u
    INNER JOIN Listing l ON u.user_id = l.cook_id
    INNER JOIN Request r ON l.listing_id = r.listing_id
    INNER JOIN Rating rating ON r.request_id = rating.request_id
    GROUP BY u.user_id, u.username
    ORDER BY average_rating DESC, total_ratings DESC, u.username ASC
    LIMIT ?
  `;

    db.query(topDonorsQuery, [limit], (donorErr, topDonors) => {
        if (donorErr) {
            return res.status(500).json({
                error: 'Database error',
                details: donorErr.message
            });
        }

        db.query(highestRatedQuery, [limit], (ratingErr, highestRated) => {
            if (ratingErr) {
                return res.status(500).json({
                    error: 'Database error',
                    details: ratingErr.message
                });
            }

            res.json({
                topDonors,
                highestRated
            });
        });
    });
});

module.exports = router;
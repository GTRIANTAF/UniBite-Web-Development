const express = require('express');
const router = express.Router();
const db = require('../database_connection');

function isPositiveInteger(value) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0;
}

function isValidScore(value) {
    const number = Number(value);
    return Number.isInteger(number) && number >= 1 && number <= 5;
}

function rollbackWithError(res, error, statusCode = 500, message = 'Database error') {
    return db.rollback(() => {
        res.status(statusCode).json({
            error: message,
            details: error.message
        });
    });
}

// SUBMIT rating for a picked-up request
router.post('/', (req, res) => {
    const requestId = Number(req.body.request_id);
    const consumerId = Number(req.body.consumer_id);
    const score = Number(req.body.score);

    if (!isPositiveInteger(requestId)) {
        return res.status(400).json({
            error: 'Invalid request id'
        });
    }

    if (!isPositiveInteger(consumerId)) {
        return res.status(400).json({
            error: 'Invalid consumer id'
        });
    }

    if (!isValidScore(score)) {
        return res.status(400).json({
            error: 'Score must be an integer from 1 to 5'
        });
    }

    db.beginTransaction((transactionErr) => {
        if (transactionErr) {
            return res.status(500).json({
                error: 'Database error',
                details: transactionErr.message
            });
        }

        const selectQuery = `
            SELECT
                r.request_id,
                r.consumer_id,
                r.status,
                r.delivery_status,
                r.pickup_timestamp,
                r.rating_penalty_applied,
                l.cook_id,
                existing_rating.rating_id
            FROM Request r
                     INNER JOIN Listing l ON r.listing_id = l.listing_id
                     LEFT JOIN Rating existing_rating ON r.request_id = existing_rating.request_id
            WHERE r.request_id = ?
                FOR UPDATE
        `;

        db.query(selectQuery, [requestId], (selectErr, rows) => {
            if (selectErr) {
                return rollbackWithError(res, selectErr);
            }

            if (rows.length === 0) {
                return db.rollback(() => {
                    res.status(404).json({
                        error: 'Request not found'
                    });
                });
            }

            const request = rows[0];

            if (request.consumer_id !== consumerId) {
                return db.rollback(() => {
                    res.status(403).json({
                        error: 'You cannot rate this request'
                    });
                });
            }

            if (request.status !== 'Approved' || request.delivery_status !== 'Picked_Up') {
                return db.rollback(() => {
                    res.status(400).json({
                        error: 'Only picked-up approved requests can be rated'
                    });
                });
            }

            if (request.rating_id) {
                return db.rollback(() => {
                    res.status(400).json({
                        error: 'This request has already been rated'
                    });
                });
            }

            if (!request.pickup_timestamp) {
                return db.rollback(() => {
                    res.status(400).json({
                        error: 'Pickup timestamp is missing'
                    });
                });
            }

            const deadlineQuery = `
        SELECT TIMESTAMPDIFF(HOUR, ?, NOW()) AS hours_after_pickup
      `;

            db.query(deadlineQuery, [request.pickup_timestamp], (deadlineErr, deadlineRows) => {
                if (deadlineErr) {
                    return rollbackWithError(res, deadlineErr);
                }

                const hoursAfterPickup = deadlineRows[0].hours_after_pickup;

                if (hoursAfterPickup > 48) {
                    if (request.rating_penalty_applied) {
                        return db.rollback(() => {
                            res.status(400).json({
                                error: 'Rating deadline has passed'
                            });
                        });
                    }

                    const penaltyQuery = `
                        UPDATE User
                        SET points = GREATEST(points - 1, 0)
                        WHERE user_id = ?
                    `;

                    db.query(penaltyQuery, [consumerId], (penaltyErr) => {
                        if (penaltyErr) {
                            return rollbackWithError(res, penaltyErr);
                        }

                        const markPenaltyQuery = `
                            UPDATE Request
                            SET rating_penalty_applied = TRUE
                            WHERE request_id = ?
                        `;

                        db.query(markPenaltyQuery, [requestId], (markErr) => {
                            if (markErr) {
                                return rollbackWithError(res, markErr);
                            }

                            db.commit((commitErr) => {
                                if (commitErr) {
                                    return res.status(500).json({
                                        error: 'Database error',
                                        details: commitErr.message
                                    });
                                }

                                res.status(400).json({
                                    error: 'Rating deadline has passed. Consumer was penalized.'
                                });
                            });
                        });
                    });

                    return;
                }

                const bonusAwarded = score > 3;
                const cookPointsToAdd = bonusAwarded ? 2 : 1;

                const insertRatingQuery = `
                    INSERT INTO Rating (request_id, score, bonus_awarded)
                    VALUES (?, ?, ?)
                `;

                db.query(insertRatingQuery, [requestId, String(score), bonusAwarded], (insertErr, result) => {
                    if (insertErr) {
                        return rollbackWithError(res, insertErr);
                    }

                    const cookPointsQuery = `
                        UPDATE User
                        SET points = points + ?
                        WHERE user_id = ?
                    `;

                    db.query(cookPointsQuery, [cookPointsToAdd, request.cook_id], (pointsErr) => {
                        if (pointsErr) {
                            return rollbackWithError(res, pointsErr);
                        }

                        db.commit((commitErr) => {
                            if (commitErr) {
                                return res.status(500).json({
                                    error: 'Database error',
                                    details: commitErr.message
                                });
                            }

                            res.status(201).json({
                                message: bonusAwarded
                                    ? 'Rating submitted successfully. Cook received 2 points.'
                                    : 'Rating submitted successfully. Cook received 1 point.',
                                ratingId: result.insertId,
                                cookPointsAdded: cookPointsToAdd,
                                bonusAwarded
                            });
                        });
                    });
                });
            });
        });
    });
});

// APPLY penalties for picked-up requests not rated within 48 hours
router.patch('/apply-penalties', (req, res) => {
    db.beginTransaction((transactionErr) => {
        if (transactionErr) {
            return res.status(500).json({
                error: 'Database error',
                details: transactionErr.message
            });
        }

        const selectOverdueQuery = `
            SELECT
                r.request_id,
                r.consumer_id
            FROM Request r
                     LEFT JOIN Rating rating ON r.request_id = rating.request_id
            WHERE r.status = 'Approved'
              AND r.delivery_status = 'Picked_Up'
              AND r.pickup_timestamp IS NOT NULL
              AND r.pickup_timestamp <= NOW() - INTERVAL 48 HOUR
              AND r.rating_penalty_applied = FALSE
              AND rating.rating_id IS NULL
                FOR UPDATE
        `;

        db.query(selectOverdueQuery, (selectErr, overdueRequests) => {
            if (selectErr) {
                return rollbackWithError(res, selectErr);
            }

            if (overdueRequests.length === 0) {
                return db.commit((commitErr) => {
                    if (commitErr) {
                        return res.status(500).json({
                            error: 'Database error',
                            details: commitErr.message
                        });
                    }

                    res.json({
                        message: 'No overdue ratings found',
                        penalizedUsers: 0
                    });
                });
            }

            const requestIds = overdueRequests.map((request) => request.request_id);
            const consumerIds = overdueRequests.map((request) => request.consumer_id);

            const penaltyQuery = `
                UPDATE User
                SET points = GREATEST(points - 1, 0)
                WHERE user_id IN (?)
            `;

            db.query(penaltyQuery, [consumerIds], (penaltyErr) => {
                if (penaltyErr) {
                    return rollbackWithError(res, penaltyErr);
                }

                const markPenaltyQuery = `
                    UPDATE Request
                    SET rating_penalty_applied = TRUE
                    WHERE request_id IN (?)
                `;

                db.query(markPenaltyQuery, [requestIds], (markErr) => {
                    if (markErr) {
                        return rollbackWithError(res, markErr);
                    }

                    db.commit((commitErr) => {
                        if (commitErr) {
                            return res.status(500).json({
                                error: 'Database error',
                                details: commitErr.message
                            });
                        }

                        res.json({
                            message: 'Rating penalties applied successfully',
                            penalizedUsers: overdueRequests.length
                        });
                    });
                });
            });
        });
    });
});

module.exports = router;
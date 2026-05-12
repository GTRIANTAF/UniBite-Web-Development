const express = require('express');
const router = express.Router();
const db = require('../database_connection');

function isPositiveInteger(value) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0;
}

function rollbackWithError(res, error, statusCode = 500, message = 'Database error') {
    return db.rollback(() => {
        res.status(statusCode).json({
            error: message,
            details: error.message
        });
    });
}

// CREATE request / reserve portion by consumer
router.post('/', (req, res) => {
    const listingId = Number(req.body.listing_id);
    const consumerId = Number(req.body.consumer_id);

    if (!isPositiveInteger(listingId)) {
        return res.status(400).json({
            error: 'Invalid listing id'
        });
    }

    if (!isPositiveInteger(consumerId)) {
        return res.status(400).json({
            error: 'Invalid consumer id'
        });
    }

    db.beginTransaction((transactionErr) => {
        if (transactionErr) {
            return res.status(500).json({
                error: 'Database error',
                details: transactionErr.message
            });
        }

        const checkQuery = `
      SELECT
        l.listing_id,
        l.cook_id,
        l.available_portions,
        l.status AS listing_status,
        TIMESTAMPDIFF(HOUR, l.creation_timestamp, NOW()) AS listing_age_hours,
        u.points AS consumer_points,
        (
          SELECT COUNT(*)
          FROM Request active_r
          WHERE active_r.consumer_id = ?
            AND active_r.status IN ('Pending', 'Approved')
            AND active_r.delivery_status = 'Pending'
        ) AS active_requests
      FROM Listing l
      INNER JOIN User u ON u.user_id = ?
      WHERE l.listing_id = ?
      FOR UPDATE
    `;

        db.query(checkQuery, [consumerId, consumerId, listingId], (checkErr, rows) => {
            if (checkErr) {
                return rollbackWithError(res, checkErr);
            }

            if (rows.length === 0) {
                return db.rollback(() => {
                    res.status(404).json({
                        error: 'Listing or consumer not found'
                    });
                });
            }

            const data = rows[0];
            const availablePoints = data.consumer_points - data.active_requests;

            if (data.cook_id === consumerId) {
                return db.rollback(() => {
                    res.status(400).json({
                        error: 'Cook cannot request their own listing'
                    });
                });
            }

            if (availablePoints < 1) {
                return db.rollback(() => {
                    res.status(400).json({
                        error: 'Consumer does not have enough available points'
                    });
                });
            }

            if (data.listing_age_hours >= 48 || data.listing_status === 'Deleted') {
                const expireQuery = `
          UPDATE Listing
          SET status = 'Deleted'
          WHERE listing_id = ?
        `;

                return db.query(expireQuery, [listingId], (expireErr) => {
                    if (expireErr) {
                        return rollbackWithError(res, expireErr);
                    }

                    db.commit((commitErr) => {
                        if (commitErr) {
                            return res.status(500).json({
                                error: 'Database error',
                                details: commitErr.message
                            });
                        }

                        res.status(400).json({
                            error: 'Listing has expired'
                        });
                    });
                });
            }

            if (data.available_portions <= 0 || data.listing_status === 'Inactive') {
                return db.rollback(() => {
                    res.status(400).json({
                        error: 'No available portions for this listing'
                    });
                });
            }

            const duplicateQuery = `
        SELECT request_id
        FROM Request
        WHERE listing_id = ?
          AND consumer_id = ?
          AND status IN ('Pending', 'Approved')
          AND delivery_status = 'Pending'
      `;

            db.query(duplicateQuery, [listingId, consumerId], (duplicateErr, duplicateRows) => {
                if (duplicateErr) {
                    return rollbackWithError(res, duplicateErr);
                }

                if (duplicateRows.length > 0) {
                    return db.rollback(() => {
                        res.status(400).json({
                            error: 'Consumer already has an active request for this listing'
                        });
                    });
                }

                const insertQuery = `
          INSERT INTO Request (listing_id, consumer_id)
          VALUES (?, ?)
        `;

                db.query(insertQuery, [listingId, consumerId], (insertErr, result) => {
                    if (insertErr) {
                        return rollbackWithError(res, insertErr);
                    }

                    db.commit((commitErr) => {
                        if (commitErr) {
                            return res.status(500).json({
                                error: 'Database error',
                                details: commitErr.message
                            });
                        }

                        res.status(201).json({
                            message: 'Request created successfully',
                            requestId: result.insertId
                        });
                    });
                });
            });
        });
    });
});

// GET all requests for a cook's listings
router.get('/cook/:cookId', (req, res) => {
    const cookId = Number(req.params.cookId);

    if (!isPositiveInteger(cookId)) {
        return res.status(400).json({
            error: 'Invalid cook id'
        });
    }

    const query = `
    SELECT
      r.request_id,
      r.listing_id,
      r.consumer_id,
      r.status,
      r.delivery_status,
      r.creation_timestamp,
      r.decision_timestamp,
      r.pickup_timestamp,
      l.title,
      l.pickup_location,
      l.pickup_building,
      l.pickup_details,
      l.pickup_time,
      l.available_portions,
      l.total_portions,
      u.username AS consumer_username,
      u.email AS consumer_email
    FROM Request r
    INNER JOIN Listing l ON r.listing_id = l.listing_id
    INNER JOIN User u ON r.consumer_id = u.user_id
    WHERE l.cook_id = ?
      AND l.status != 'Deleted'
    ORDER BY r.creation_timestamp DESC
  `;

    db.query(query, [cookId], (err, results) => {
        if (err) {
            return res.status(500).json({
                error: 'Database error',
                details: err.message
            });
        }

        res.json(results);
    });
});

// APPROVE request
router.patch('/:requestId/approve', (req, res) => {
    const requestId = Number(req.params.requestId);
    const cookId = Number(req.body.cook_id);

    if (!isPositiveInteger(requestId)) {
        return res.status(400).json({
            error: 'Invalid request id'
        });
    }

    if (!isPositiveInteger(cookId)) {
        return res.status(400).json({
            error: 'Invalid cook id'
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
        r.status AS request_status,
        r.delivery_status,
        l.listing_id,
        l.cook_id,
        l.available_portions,
        l.status AS listing_status,
        TIMESTAMPDIFF(HOUR, l.creation_timestamp, NOW()) AS listing_age_hours
      FROM Request r
      INNER JOIN Listing l ON r.listing_id = l.listing_id
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

            if (request.cook_id !== cookId) {
                return db.rollback(() => {
                    res.status(403).json({
                        error: 'You do not own this listing'
                    });
                });
            }

            if (request.request_status !== 'Pending' || request.delivery_status !== 'Pending') {
                return db.rollback(() => {
                    res.status(400).json({
                        error: 'Only pending requests can be approved'
                    });
                });
            }

            if (request.listing_age_hours >= 48 || request.listing_status === 'Deleted') {
                const expireQuery = `
          UPDATE Listing
          SET status = 'Deleted'
          WHERE listing_id = ?
        `;

                return db.query(expireQuery, [request.listing_id], (expireErr) => {
                    if (expireErr) {
                        return rollbackWithError(res, expireErr);
                    }

                    db.commit((commitErr) => {
                        if (commitErr) {
                            return res.status(500).json({
                                error: 'Database error',
                                details: commitErr.message
                            });
                        }

                        res.status(400).json({
                            error: 'Listing has expired'
                        });
                    });
                });
            }

            if (request.available_portions <= 0 || request.listing_status === 'Inactive') {
                return db.rollback(() => {
                    res.status(400).json({
                        error: 'No available portions for this listing'
                    });
                });
            }

            const approveQuery = `
        UPDATE Request
        SET status = 'Approved',
            decision_timestamp = NOW()
        WHERE request_id = ?
      `;

            db.query(approveQuery, [requestId], (approveErr) => {
                if (approveErr) {
                    return rollbackWithError(res, approveErr);
                }

                const updateListingQuery = `
          UPDATE Listing
          SET available_portions = available_portions - 1,
              status = CASE
                WHEN available_portions - 1 = 0 THEN 'Inactive'
                ELSE 'Active'
              END
          WHERE listing_id = ?
        `;

                db.query(updateListingQuery, [request.listing_id], (listingErr) => {
                    if (listingErr) {
                        return rollbackWithError(res, listingErr);
                    }

                    db.commit((commitErr) => {
                        if (commitErr) {
                            return res.status(500).json({
                                error: 'Database error',
                                details: commitErr.message
                            });
                        }

                        res.json({
                            message: 'Request approved successfully'
                        });
                    });
                });
            });
        });
    });
});

// REJECT request
router.patch('/:requestId/reject', (req, res) => {
    const requestId = Number(req.params.requestId);
    const cookId = Number(req.body.cook_id);

    if (!isPositiveInteger(requestId)) {
        return res.status(400).json({
            error: 'Invalid request id'
        });
    }

    if (!isPositiveInteger(cookId)) {
        return res.status(400).json({
            error: 'Invalid cook id'
        });
    }

    const query = `
    UPDATE Request r
    INNER JOIN Listing l ON r.listing_id = l.listing_id
    SET r.status = 'Rejected',
        r.decision_timestamp = NOW()
    WHERE r.request_id = ?
      AND l.cook_id = ?
      AND r.status = 'Pending'
      AND r.delivery_status = 'Pending'
  `;

    db.query(query, [requestId, cookId], (err, result) => {
        if (err) {
            return res.status(500).json({
                error: 'Database error',
                details: err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Pending request not found or you do not own this listing'
            });
        }

        res.json({
            message: 'Request rejected successfully'
        });
    });
});

// MARK approved request as picked up
router.patch('/:requestId/picked-up', (req, res) => {
    const requestId = Number(req.params.requestId);
    const cookId = Number(req.body.cook_id);

    if (!isPositiveInteger(requestId)) {
        return res.status(400).json({
            error: 'Invalid request id'
        });
    }

    if (!isPositiveInteger(cookId)) {
        return res.status(400).json({
            error: 'Invalid cook id'
        });
    }

    const query = `
    UPDATE Request r
    INNER JOIN Listing l ON r.listing_id = l.listing_id
    SET r.delivery_status = 'Picked_Up',
        r.pickup_timestamp = NOW()
    WHERE r.request_id = ?
      AND l.cook_id = ?
      AND r.status = 'Approved'
      AND r.delivery_status = 'Pending'
  `;

    db.query(query, [requestId, cookId], (err, result) => {
        if (err) {
            return res.status(500).json({
                error: 'Database error',
                details: err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Approved pending pickup request not found or you do not own this listing'
            });
        }

        res.json({
            message: 'Pickup marked successfully'
        });
    });
});

// MARK approved request as no-show and penalize consumer
router.patch('/:requestId/no-show', (req, res) => {
    const requestId = Number(req.params.requestId);
    const cookId = Number(req.body.cook_id);

    if (!isPositiveInteger(requestId)) {
        return res.status(400).json({
            error: 'Invalid request id'
        });
    }

    if (!isPositiveInteger(cookId)) {
        return res.status(400).json({
            error: 'Invalid cook id'
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
        l.cook_id
      FROM Request r
      INNER JOIN Listing l ON r.listing_id = l.listing_id
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

            if (request.cook_id !== cookId) {
                return db.rollback(() => {
                    res.status(403).json({
                        error: 'You do not own this listing'
                    });
                });
            }

            if (request.status !== 'Approved' || request.delivery_status !== 'Pending') {
                return db.rollback(() => {
                    res.status(400).json({
                        error: 'Only approved pending pickup requests can be marked as no-show'
                    });
                });
            }

            const updateRequestQuery = `
        UPDATE Request
        SET delivery_status = 'No_Show'
        WHERE request_id = ?
      `;

            db.query(updateRequestQuery, [requestId], (updateRequestErr) => {
                if (updateRequestErr) {
                    return rollbackWithError(res, updateRequestErr);
                }

                const penaltyQuery = `
          UPDATE User
          SET points = GREATEST(points - 1, 0)
          WHERE user_id = ?
        `;

                db.query(penaltyQuery, [request.consumer_id], (penaltyErr) => {
                    if (penaltyErr) {
                        return rollbackWithError(res, penaltyErr);
                    }

                    db.commit((commitErr) => {
                        if (commitErr) {
                            return res.status(500).json({
                                error: 'Database error',
                                details: commitErr.message
                            });
                        }

                        res.json({
                            message: 'No-show marked successfully and consumer was penalized'
                        });
                    });
                });
            });
        });
    });
});

module.exports = router;
const express = require('express');
const router = express.Router();
const db = require('../database_connection');

const editableStatuses = ['Active', 'Inactive'];

function isPositiveInteger(value) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0;
}

function isNonNegativeInteger(value) {
    const number = Number(value);
    return Number.isInteger(number) && number >= 0;
}

function normalizeOptionalText(value) {
    return value && value.trim() !== '' ? value.trim() : null;
}

function refreshListingStatuses(callback) {
    const query = `
        UPDATE Listing
        SET status = CASE
            WHEN creation_timestamp <= NOW() - INTERVAL 48 HOUR THEN 'Deleted'
            WHEN available_portions = 0 THEN 'Inactive'
            ELSE 'Active'
        END
        WHERE status != 'Deleted'
    `;

    db.query(query, callback);
}

async function geocodePickupLocation(pickupLocation, pickupBuilding) {
    let latitude = 38.2462;
    let longitude = 21.7351;

    try {
        const addressText = `${pickupLocation}, ${pickupBuilding}, Πάτρα, Ελλάδα`;
        const addressQuery = encodeURIComponent(addressText);
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${addressQuery}&limit=1`;

        const geoResponse = await fetch(geocodeUrl, {
            headers: {
                'User-Agent': 'UniBite_Student_Project_Upatras'
            }
        });

        const geoData = await geoResponse.json();

        if (geoData && geoData.length > 0) {
            latitude = parseFloat(geoData[0].lat);
            longitude = parseFloat(geoData[0].lon);
        }
    } catch (error) {
        console.error('Nominatim geocoding error:', error.message);
    }

    return { latitude, longitude };
}

// GET all visible listings
router.get('/', (req, res) => {
    const userId = req.query.userId ? Number(req.query.userId) : 0;

    refreshListingStatuses((statusErr) => {
        if (statusErr) {
            return res.status(500).json({ error: 'Database error', details: statusErr.message });
        }

        const query = `
            SELECT L.*,
                   (SELECT COUNT(*) FROM Request R WHERE R.listing_id = L.listing_id AND R.consumer_id = ?) AS already_requested
            FROM Listing L
            WHERE L.status IN ('Active', 'Inactive')
              AND L.creation_timestamp > NOW() - INTERVAL 48 HOUR
            ORDER BY L.creation_timestamp DESC
        `;

        db.query(query, [userId], (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Database error', details: err.message });
            }
            res.json(results);
        });
    });
});

// GET listings by cook
router.get('/cook/:cookId', (req, res) => {
    const cookId = Number(req.params.cookId);

    if (!Number.isInteger(cookId) || cookId <= 0) {
        return res.status(400).json({
            error: 'Invalid cook id'
        });
    }

    refreshListingStatuses((statusErr) => {
        if (statusErr) {
            return res.status(500).json({
                error: 'Database error while refreshing listing statuses',
                details: statusErr.message
            });
        }

        const query = `
            SELECT *
            FROM Listing
            WHERE cook_id = ?
              AND status != 'Deleted'
            ORDER BY creation_timestamp DESC
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
});

// GET pickup info for a listing
router.get('/:id/pickup-info', (req, res) => {
    const listingId = Number(req.params.id);

    if (!Number.isInteger(listingId) || listingId <= 0) {
        return res.status(400).json({
            error: 'Invalid listing id'
        });
    }

    refreshListingStatuses((statusErr) => {
        if (statusErr) {
            return res.status(500).json({
                error: 'Database error while refreshing listing statuses',
                details: statusErr.message
            });
        }

        const query = `
            SELECT
                listing_id,
                title,
                pickup_location,
                pickup_building,
                pickup_details,
                pickup_time,
                latitude,
                longitude
            FROM Listing
            WHERE listing_id = ?
              AND status != 'Deleted'
        `;

        db.query(query, [listingId], (err, results) => {
            if (err) {
                return res.status(500).json({
                    error: 'Database error',
                    details: err.message
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    error: 'Listing not found'
                });
            }

            res.json(results[0]);
        });
    });
});

// GET single listing
router.get('/:id', (req, res) => {
    const listingId = Number(req.params.id);

    if (!Number.isInteger(listingId) || listingId <= 0) {
        return res.status(400).json({
            error: 'Invalid listing id'
        });
    }

    refreshListingStatuses((statusErr) => {
        if (statusErr) {
            return res.status(500).json({
                error: 'Database error while refreshing listing statuses',
                details: statusErr.message
            });
        }

        const query = `
            SELECT *
            FROM Listing
            WHERE listing_id = ?
              AND status != 'Deleted'
        `;

        db.query(query, [listingId], (err, results) => {
            if (err) {
                return res.status(500).json({
                    error: 'Database error',
                    details: err.message
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    error: 'Listing not found'
                });
            }

            res.json(results[0]);
        });
    });
});

// CREATE listing
router.post('/', async (req, res) => {
    const {
        cook_id,
        title,
        description,
        photo_url,
        allergens,
        pickup_location,
        pickup_building,
        pickup_details,
        pickup_time,
        total_portions
    } = req.body;

    if (
        !cook_id ||
        !title ||
        !description ||
        !pickup_location ||
        !pickup_building ||
        !pickup_time ||
        !total_portions
    ) {
        return res.status(400).json({
            error: 'Missing required fields'
        });
    }

    const cookId = Number(cook_id);
    const portions = Number(total_portions);

    if (!Number.isInteger(cookId) || cookId <= 0) {
        return res.status(400).json({
            error: 'Invalid cook id'
        });
    }

    if (!isPositiveInteger(portions)) {
        return res.status(400).json({
            error: 'Total portions must be a positive integer'
        });
    }

    const coordinates = await geocodePickupLocation(
        pickup_location.trim(),
        pickup_building.trim()
    );

    const checkCookQuery = `
        SELECT user_id
        FROM User
        WHERE user_id = ?
    `;

    db.query(checkCookQuery, [cookId], (cookErr, cookResults) => {
        if (cookErr) {
            return res.status(500).json({
                error: 'Database error',
                details: cookErr.message
            });
        }

        if (cookResults.length === 0) {
            return res.status(404).json({
                error: 'Cook not found'
            });
        }

        const query = `
            INSERT INTO Listing
            (
                cook_id,
                title,
                description,
                photo_url,
                allergens,
                pickup_location,
                pickup_building,
                pickup_details,
                pickup_time,
                latitude,
                longitude,
                total_portions,
                available_portions,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
        `;

        db.query(
            query,
            [
                cookId,
                title.trim(),
                description.trim(),
                normalizeOptionalText(photo_url),
                normalizeOptionalText(allergens),
                pickup_location.trim(),
                pickup_building.trim(),
                normalizeOptionalText(pickup_details),
                pickup_time,
                coordinates.latitude,
                coordinates.longitude,
                portions,
                portions
            ],
            (err, result) => {
                if (err) {
                    return res.status(500).json({
                        error: 'Database error',
                        details: err.message
                    });
                }

                res.status(201).json({
                    message: 'Listing created successfully',
                    listingId: result.insertId,
                    coordinates
                });
            }
        );
    });
});

// UPDATE listing
router.put('/:id', async (req, res) => {
    const listingId = Number(req.params.id);

    if (!Number.isInteger(listingId) || listingId <= 0) {
        return res.status(400).json({
            error: 'Invalid listing id'
        });
    }

    const {
        cook_id,
        title,
        description,
        photo_url,
        allergens,
        pickup_location,
        pickup_building,
        pickup_details,
        pickup_time,
        total_portions,
        available_portions,
        status
    } = req.body;

    if (
        !cook_id ||
        !title ||
        !description ||
        !pickup_location ||
        !pickup_building ||
        !pickup_time ||
        !total_portions
    ) {
        return res.status(400).json({
            error: 'Missing required fields'
        });
    }

    const cookId = Number(cook_id);
    const portions = Number(total_portions);
    const available = available_portions === undefined
        ? portions
        : Number(available_portions);
    const listingStatus = status || 'Active';

    if (!Number.isInteger(cookId) || cookId <= 0) {
        return res.status(400).json({
            error: 'Invalid cook id'
        });
    }

    if (!isPositiveInteger(portions)) {
        return res.status(400).json({
            error: 'Total portions must be a positive integer'
        });
    }

    if (!isNonNegativeInteger(available)) {
        return res.status(400).json({
            error: 'Available portions must be zero or a positive integer'
        });
    }

    if (available > portions) {
        return res.status(400).json({
            error: 'Available portions cannot be more than total portions'
        });
    }

    if (!editableStatuses.includes(listingStatus)) {
        return res.status(400).json({
            error: 'Invalid listing status'
        });
    }

    const coordinates = await geocodePickupLocation(
        pickup_location.trim(),
        pickup_building.trim()
    );

    const query = `
        UPDATE Listing
        SET
            title = ?,
            description = ?,
            photo_url = ?,
            allergens = ?,
            pickup_location = ?,
            pickup_building = ?,
            pickup_details = ?,
            pickup_time = ?,
            latitude = ?,
            longitude = ?,
            total_portions = ?,
            available_portions = ?,
            status = ?
        WHERE listing_id = ?
          AND cook_id = ?
          AND status != 'Deleted'
    `;

    db.query(
        query,
        [
            title.trim(),
            description.trim(),
            normalizeOptionalText(photo_url),
            normalizeOptionalText(allergens),
            pickup_location.trim(),
            pickup_building.trim(),
            normalizeOptionalText(pickup_details),
            pickup_time,
            coordinates.latitude,
            coordinates.longitude,
            portions,
            available,
            listingStatus,
            listingId,
            cookId
        ],
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    error: 'Database error',
                    details: err.message
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    error: 'Listing not found or you do not own this listing'
                });
            }

            res.json({
                message: 'Listing updated successfully',
                coordinates
            });
        }
    );
});

// SOFT DELETE listing
router.delete('/:id', (req, res) => {
    const listingId = Number(req.params.id);
    const cookId = Number(req.body.cook_id);

    if (!Number.isInteger(listingId) || listingId <= 0) {
        return res.status(400).json({
            error: 'Invalid listing id'
        });
    }

    if (!Number.isInteger(cookId) || cookId <= 0) {
        return res.status(400).json({
            error: 'Invalid cook id'
        });
    }

    const query = `
        UPDATE Listing
        SET status = 'Deleted'
        WHERE listing_id = ?
          AND cook_id = ?
          AND status != 'Deleted'
    `;

    db.query(query, [listingId, cookId], (err, result) => {
        if (err) {
            return res.status(500).json({
                error: 'Database error',
                details: err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Listing not found or you do not own this listing'
            });
        }

        res.json({
            message: 'Listing deleted successfully'
        });
    });
});

module.exports = router;
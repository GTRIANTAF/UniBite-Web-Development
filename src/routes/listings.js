const express = require('express');
const router = express.Router();
const db = require('../database_connection');


// GET all listings
router.get('/', (req, res) => {

    const query = `
    SELECT * FROM food_Posting
    WHERE creation_timestamp > NOW() - INTERVAL 48 HOUR
    `;
    
  db.query(query, (err, results) => {

    if (err) {

      res.status(500).json(err);

    } else {

      res.json(results);

    }

  });

});


// CREATE listing
router.post('/', (req, res) => {

  const {
    cook_id,
    title,
    description,
    allergens,
    pickup_location,
    pickup_time,
    total_portions
  } = req.body;

  const query = `
    INSERT INTO food_Posting
    (cook_id, title, description, allergens, pickup_location, pickup_time, total_portions)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [
      cook_id,
      title,
      description,
      allergens,
      pickup_location,
      pickup_time,
      total_portions
    ],
    (err, result) => {

      if (err) {

        res.status(500).json(err);

      } else {

        res.json({
          message: 'Listing created successfully',
          listingId: result.insertId
        });

      }

    }
  );

});


// UPDATE listing
router.put('/:id', (req, res) => {

  const listingId = req.params.id;

  const {
    title,
    description,
    allergens,
    pickup_location,
    pickup_time,
    total_portions
  } = req.body;

  const query = `
    UPDATE food_Posting
    SET
      title = ?,
      description = ?,
      allergens = ?,
      pickup_location = ?,
      pickup_time = ?,
      total_portions = ?
    WHERE listing_id = ?
  `;

  db.query(
    query,
    [
      title,
      description,
      allergens,
      pickup_location,
      pickup_time,
      total_portions,
      listingId
    ],
    (err, result) => {

      if (err) {

        res.status(500).json(err);

      } else {

        res.json({
          message: 'Listing updated successfully'
        });

      }

    }
  );

});


// DELETE listing
router.delete('/:id', (req, res) => {

  const listingId = req.params.id;

  const query = `
    DELETE FROM food_Posting
    WHERE listing_id = ?
  `;

  db.query(query, [listingId], (err, result) => {

    if (err) {

      res.status(500).json(err);

    } else {

      res.json({
        message: 'Listing deleted successfully'
      });

    }

  });

});


module.exports = router;
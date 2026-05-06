const db = require('./database_connection');
const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server is working');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});

app.get('/listings', (req, res) => {
  db.query('SELECT * FROM food_Posting', (err, results) => {
    if (err) {
      res.status(500).json(err);
    } else {
      res.json(results);
    }
  });
});

app.get('/test-db', (req, res) => {
  db.query('SELECT 1 + 1 AS result', (err, results) => {
    if (err) {
      res.status(500).json(err);
    } else {
      res.json(results);
    }
  });
});

app.get('/users', (req, res) => {
  db.query('SELECT * FROM User', (err, results) => {
    if (err) {
      res.status(500).json(err);
    } else {
      res.json(results);
    }
  });
});

app.post('/listings', (req, res) => {
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
    VALUES (?, ?, ?, ?, ?, ?, ?)`;

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

app.delete('/listings/:id', (req, res) => {

  const listingId = req.params.id;

  const query = `
    DELETE FROM food_Posting
    WHERE listing_id = ?
  `;

  db.query(query, [listingId], (err, result) => {

    if (err) {
      res.status(500).json(err);

    } else {

      if (result.affectedRows === 0) {

        res.status(404).json({
          message: 'Listing not found'
        });

      } else {

        res.json({
          message: 'Listing deleted successfully'
        });

      }

    }

  });

});

app.put('/listings/:id', (req, res) => {

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

        if (result.affectedRows === 0) {

          res.status(404).json({
            message: 'Listing not found'
          });

        } else {

          res.json({
            message: 'Listing updated successfully'
          });

        }

      }

    }
  );

});

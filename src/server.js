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
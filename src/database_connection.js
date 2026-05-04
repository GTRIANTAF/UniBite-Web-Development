const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'UniBite'
});

connection.connect((err) => {
  if (err) {
    console.error(' Error connecting to DB:', err);
  } else {
    console.log(' Connected to MySQL');
  }
});

module.exports = connection;
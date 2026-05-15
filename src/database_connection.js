const mysql = require('mysql2');

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'UniBite'
});

db.connect((err) => {
    if (err) {
        console.error('Σφάλμα σύνδεσης με τη βάση:', err.message);
        return;
    }

    console.log('Συνδέθηκε επιτυχώς στη MySQL (UniBite)!');
});

module.exports = db;

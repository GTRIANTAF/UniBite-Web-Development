const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'UniBite'
});

db.connect((err) => {
    if (err) {
        console.error('Σφάλμα σύνδεσης με τη βάση:', err.message);
        return;
    }
    console.log('Συνδέθηκε επιτυχώς στη MySQL (UniBite)!');
});

module.exports = db;
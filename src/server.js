const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Εισαγωγή των Routes
const listingsRouter = require('./routes/listings');

// Middleware
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

αpp.use('/api/listings', listingsRouter);

app.listen(PORT, () => {
    console.log(`Ο server τρέχει στο http://localhost:${PORT}`);
});
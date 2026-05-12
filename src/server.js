const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Εισαγωγή των Routes
const listingsRouter = require('./routes/listings');
const requestRouter = require('./routes/requests');
const ordersRouter = require('./routes/orders');
const ratingsRouter = require('./routes/ratings');
const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');

// Middleware
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

app.use('/api/listings', listingsRouter);
app.use('/api/requests', requestRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/ratings', ratingsRouter);
app.use('/api/users', usersRouter);
app.use('/api/auth', authRouter);

app.listen(PORT, () => {
    console.log(`Ο server τρέχει στο http://localhost:${PORT}`);
});
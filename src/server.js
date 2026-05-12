const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Εισαγωγή των Routes
const listingsRouter = require('./routes/listings');
const requestsRouter = require('./routes/requests');
const ratingsRouter = require('./routes/ratings');
const adminRouter = require('./routes/admin');
const ordersRouter = require('./routes/orders');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');

// Middleware
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/start.html'));
});

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

app.use('/api/listings', listingsRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/ratings', ratingsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);

app.listen(PORT, () => {
    console.log(`Ο server τρέχει στο http://localhost:${PORT}`);
});

const express = require('express');
const morgan = require('morgan');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');


const fs = require('fs');
const AppError = require('./utils/appError');

const globalErrorHandler = require('./controllers/errorController');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const path = require('path');
const cors = require('cors');

const userRouter = require('./routes/userRoutes');
const productRouter = require('./routes/productRoutes');
const orderRouter = require('./routes/orderRoutes');

const app = express();

// LIMIT REQUESTS FROM SAME API
const limiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again in an hour!⌚'
});

app.use('/marketAPI', limiter);

// BODY PARSER, reading data from body into req.body

app.use(bodyParser.raw({ type: 'application/octet-stream', limit: '10mb' }));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


app.use(cookieParser());

// DATA SANITIZATION AGAINST NOSQL QUERY INJECTION
app.use(mongoSanitize());

// DATA SANITIZATION AGAINST XSS
app.use(xss());

// // PREVENT PARAMETER POLLUTION
// app.use(hpp({
//   whitelist: [
//     'duration',
//     'ratingsQuantity',
//     'ratingsAverage',
//     'maxGroupSize',
//     'difficulty',
//     'price',
//   ]
// }));



/////////////////////// ROUTES /////////////////////////

app.use('/marketAPI/v1/users', userRouter);
app.use('/marketAPI/v1/products', productRouter);
app.use('/marketAPI/v1/orders', orderRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
});

module.exports = app;
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const Joi = require('joi');
const User = require('../models/userModel');

exports.createProductJoi = catchAsync(async (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string().required().min(5).max(30).trim(),
        ratingsAverage: Joi.number().default(4.5).min(1).max(5).custom(val => Math.round(val * 10) / 10),
        ratingsQuantity: Joi.number().default(0),
        price: Joi.number().required(),
        priceDiscount: Joi.number().less(Joi.ref('price')),
        description: Joi.string().required().trim(),
        quantity: Joi.number().required().min(1).max(8000),
        category: Joi.string().required().valid('Electronics', 'Clothing', 'Home & Garden', 'Sports & Outdoors', 'Books', 'Toys', 'Other').messages({
            'any.only': 'Product category must be one of the following: Electronics, Clothing, Home & Garden, Sports & Outdoors, Books, Toys, Other'
        })
    });

    const { error, value } = schema.validate(req.body);

    if (error) {
        return next(new AppError(error.details[0].message, 422));
    }

    // req.body = value;
    next();
});

exports.createUserJoi = catchAsync(async (req, res, next) => {
    const schema = Joi.object({
        username: Joi.string().required().min(1).max(15).trim(),
        email: Joi.string().required().trim().lowercase().email(),
        password: Joi.string().required().min(8).max(1024),
        passwordConfirm: Joi.string().required().valid(Joi.ref('password')).messages({
            'any.only': 'Passwords do not match 🔑'
        }),
        role: Joi.string().required().valid('Admin', 'Seller', 'Consumer'),
        active: Joi.boolean().default(true),
        address: Joi.string().trim().when('role', { is: 'Consumer', then: Joi.required() }),
        certificate: Joi.string().when('role', { is: 'Seller', then: Joi.required() })
    });

    const { error, value } = schema.validate(req.body);

    if (error) {
        return next(new AppError(error.details[0].message, 422));
    }

    const emailExists = await User.findOne({ email: value.email });
    if (emailExists) {
        return next(new AppError('Email already in use 📧❗', 400));
    }

    // req.body = value;
    next();
});
  

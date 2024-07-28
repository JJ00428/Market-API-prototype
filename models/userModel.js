const crypto = require('crypto');
const validator = require('validator');
const Product = require('./productModel');
const Tour = require('./OrderModel');

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usersSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Please provide a username 🪪']
    },
    email: {
        type: String,
        required: [true, 'Please provide your email 📧'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please enter a valid email 📧']
    },
    role: {
        type: String,
        required: [true, 'Are you a  Consumer, Seller or an Admin? 😶‍🌫️'],
        enum: ['Consumer','Seller','Admin']
      },
    password: {
        type: String,
        required: [true, 'Please provide a password 🔑'],
        minlength: [8, "Password must be at least include 8 characters 🔑"],
        select: false
    },
    passwordConfirm:{
        type: String,
        required: [true, 'Please confirm your password 🔑'],
        validate: {
            //ONLY WORKS ON CREATE AND SAVE!!
            validator: function(el) {
                return el === this.password;
            },
            message: 'Passwords do not match 🔑'
        }
    },
    active: {
        type: Boolean,
        default: true,
        select: false
    },
    favorites: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'Product',
            default: []
        }
    ],
    address: {
        type: String,
        validate: {
          validator: function(value) {
            // If role is 'Consumer', address is required and must not be only whitespace
            if (this.role === 'Consumer' && (!value || value.trim().length === 0)) {
              return false;
            }
            return true;
          },
          message: 'Please enter your address 🏠'
        }
      },
    products:[
        {
            type: mongoose.Schema.ObjectId,
            ref: 'Product'
        }
        
    ],
    orders:[
        {
            type: mongoose.Schema.ObjectId,
            ref: 'Order'
        }
    ],
    certificate:{
        type: String,
        validate: {
          validator: function(value) {
            if (this.role === 'Seller' && (!value || value.trim().length === 0)) {
              return false;
            }
            return true;
          },
          message: 'Please enter your Certificate 📜'
        }
    },
    cart: [
        {
          product: {
            type: mongoose.Schema.ObjectId,
            ref: 'Product'
          },
          quantity: Number,
        },
    ],
    photo: String,
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date
  
},{
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// usersSchema.virtual('cart', {
//     ref: 'Product',
//     foreignField: 'product',
//     localField: '_id'
// });

usersSchema.pre('save', function(next) {
    if (this.role === 'Consumer' && (!this.address || this.address.trim().length === 0)) {
      return next(new Error('Please enter your address 🏠'));
    }
    next();
  });


/////// Middleware to hash passwords before saving /////////

usersSchema.pre('save', async function(next) {
    //run only when password is actually changed
    if(!this.isModified('password')){
         return next();
    }

    //Hash password
    this.password = await bcrypt.hash(this.password, 12);

     // Clear passwordConfirm field
    this.passwordConfirm = undefined;

    next();
});

usersSchema.pre('save', function(next) {
    //Password is changed or created
    if (!this.isModified('password') || this.isNew) return next();
  
    //store time it got changed or created at
    this.passwordChangedAt = Date.now() - 1000;
    next();
});

usersSchema.pre(/^find/, function(next) {
    this.find({ active: { $ne: false } });
    next();
});

usersSchema.methods.correctPassword = async function(enteredPassword, userPassword){
    return await bcrypt.compare(enteredPassword, userPassword);
};

usersSchema.methods.changedPasswordAfter = async function(JWTTimestamp){
   if(this.passwordChangedAt){
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000,10);
        return JWTTimestamp < changedTimestamp;
    }

    return false;
}

usersSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
  
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  
    console.log({ resetToken }, this.passwordResetToken);
  
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  
    return resetToken;
  };

const User = mongoose.model('User', usersSchema);

module.exports = User;
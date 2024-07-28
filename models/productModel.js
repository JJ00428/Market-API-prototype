const mongoose = require('mongoose');
const slugify = require('slugify');
const User = require('./userModel');

const productSchema= new mongoose.Schema({
    name: {
      type: String,
      required: [true, "Product must have a name 📛"],
      maxlength: [30, "A Product  name must have less than or equal to 40 characters 📛"],
      minlength: [5, "A Product name must have more than or equal to 5 characters 📛"],
      trim: true
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, "Rating must be above 1.0 🔢"],
      max: [5, "Rating must be below 5.0 🔢"],
      set: val => Math.round(val * 10) / 10 //rounding ratings
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, "Product must have a price 💵"]
    },
    priceDiscount:{ 
      type: Number,
      validate: { 
       validator: function(val){
            return val < this.price;
      },
  
      message: "Discount price ({VALUE}) must be below price 📈"
      }
    },
    description: {
      type: String,
      required: [true, "Product must have a description 📝"],
      trim: true
    },
    imageCover: {
      type: String,
      // required: [true, "Product must have a cover image 🖼️"]
    },
    quantity:{
      type: Number,
      required: [true, "Product must have a quantity 🔢"]
    },
    images: [String],
    seller:{
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
    category: {
      type: String,
      required: [true, "Product must have a category 📃"],
      enum: {
        values: ['Electronics', 'Clothing', 'Home & Garden', 'Sports & Outdoors', 'Books', 'Toys', 'Other'],
        message: 'Product category must be one of the following: Electronics, Clothing, Home & Garden, Sports & Outdoors, Books, Toys, Other'
      }
    },
    slug: String
  },{
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  });

productSchema.index({ slug: 1});
productSchema.index({ price: 1, ratingsAverage: -1 });


//Virtual populate
// productSchema.virtual('reviews', {
//     ref: 'Review',
//     foreignField: 'tour',
//     localField: '_id'
//   })


///////////////////// DOCUMENT MIDDLEWARE://///////////////////

productSchema.pre('save', function(next) {
    this.slug = slugify(this.name, { lower: true });
    next();
  });


///////////////////////// QUERY MIDDLEWARE ////////////////////


productSchema.pre(/^find/, function(next){
  
    this.populate({
      path: 'seller',
      select:'username'
    })
    
    next();
  });



  
  const Product = mongoose.model('Product', productSchema);
  
  module.exports = Product;
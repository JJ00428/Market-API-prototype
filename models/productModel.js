const mongoose = require('mongoose');
const slugify = require('slugify');
const User = require('./userModel');
const Joi = require('joi');

const productSchema= new mongoose.Schema({
    name: String,
    ratingsAverage: Number,
    ratingsQuantity: Number,
    price: Number,
    priceDiscount: Number,
    description: String,
    imageCover: {
      type: String,
      // required: [true, "Product must have a cover image 🖼️"]
    },
    quantity: Number,
    images: [String],
    seller:{
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
    category: String,
    slug: String
  },{
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  });

productSchema.index({ slug: 1});
productSchema.index({ price: 1, ratingsAverage: -1 });
productSchema.index({ seller: 1});


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
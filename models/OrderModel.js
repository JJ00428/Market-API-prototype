const mongoose = require('mongoose');

const orderSchema= new mongoose.Schema({
    costumer: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    products: [{
      product: {
          type: mongoose.Schema.ObjectId,
          ref: 'Product'
      },
      quantity: {
          type: Number,
          required: true
      }
    }],
    totalPrice: {
      type: Number,
      required: [true, "Order must have a total price 💵"]
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
    Notes: {
      type: String,
      trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    date: {
        type: Date,
        default: Date.now
    },
    payment:{
      type: String,
      required: [true, "Order must have a payment method 💳"],
      enum: ['cash on delivery', 'credit']
    },
    sellers: [{
      type: mongoose.Schema.ObjectId,
      ref: 'User'
  }]
  },{
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  });


orderSchema.index({ date: 1, status: 1});



// orderSchema.virtual('sellers', {
//     ref: 'User',
//     foreignField: 'user',
//     localField: '_id',
//     select:'-__v -passwordChangedAt'
// });

orderSchema.pre(/^find/, function(next){
  
  this.populate({
    path: 'costumer',
    select:'username email'
  })
  
  next();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
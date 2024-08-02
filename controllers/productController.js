// const fs = require('fs');
const Product = require('./../models/productModel');
const AppError = require('./../utils/appError');
const User = require('./../models/userModel');

const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');




exports.getAllProducts = factory.getAll(Product);

exports.createProduct = catchAsync(async (req, res, next) => {
    const newProduct = await Product.create({
      ...req.body,
      seller: req.user.id,
    });
  
    res.status(201).json({
      status: 'success',
      data: {
        product: newProduct,
      },
    });
});

// exports.getProduct = factory.getOne(Product,{ path: 'reviews'});

exports.getProduct = factory.getOne(Product);

exports.updateProduct = catchAsync(async (req, res, next) => {
    const product = await Product.findById(req.params.id);
  
    if (!product) {
      return next(new AppError('Product does not exist 🚫', 404));
    }
  
    // console.log(product.seller.toString());

    if (product.seller._id.toString() !== req.user.id && req.user.role !== 'Admin') {
      return next(new AppError('You are not the seller of this product , nor an Admin 🚫', 403));
    }
  
    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
  
    res.status(200).json({
      status: 'success',
      data: {
        product: updatedProduct,
      },
    });
});
  

exports.deleteProduct = catchAsync(async (req, res, next) => {
    const product = await Product.findById(req.params.id);
  
    if (!product) {
      return next(new AppError('Product does not exist 🚫', 404));
    }
  
    if (product.seller._id.toString() !== req.user.id && req.user.role !== 'Admin') {
      return next(new AppError('You are not the seller of this product , nor an Admin 🚫', 403));
    }
  
    await Product.findByIdAndDelete(req.params.id);
  
    // remove product from user's cart
    await User.updateMany(
        { 'cart.product': req.params.id },
        { $pull: { cart: { product: req.params.id } } }
      );

    res.status(204).json({
      status: 'success',
      data: null,
    });
});

exports.addToCart = catchAsync(async (req, res, next) => {
    const { quantity }= req.body;
    const productId = req.params.id;

    if(!quantity || quantity<1) {
        return next(new AppError('Quantity must be given & atleast 1 🔢', 400));
    }

  
    const product = await Product.findById(productId);



    if (!product) {
      return next(new AppError('Product does not exist 🚫', 404));
    }

    // console.log(product.quantity);
    // console.log((quantity*1));
    if(quantity > product.quantity){
        return next(new AppError('Not enough stock available 🔢❌', 400));
    }
  
    const user = await User.findById(req.user.id);

    const existingCartItem = user.cart.find(item => item.product.toString() === productId);
  
    if (existingCartItem) {
      existingCartItem.quantity += quantity;
    } else {
      const price = product.price
      const seller = product.seller
      user.cart.push({ product: productId, quantity,price,seller });
    }
  
    await user.save({ validateBeforeSave: false });
  
    res.status(200).json({
      status: 'success',
      data: {
        cart: user.cart
      }
    });
  });

exports.favoriteItem = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const productId = req.params.id;

  
    const user = await User.findById(userId);
  
    const product = await Product.findById(productId);

    if (!product) {
      return next(new AppError('Product not found 🚫', 404));
    }
  
    const favoriteIndex = user.favorites.indexOf(productId);
  
    if (favoriteIndex === -1) {
      user.favorites.push(productId);
    } else {
      user.favorites.splice(favoriteIndex, 1);
    }
  
    await user.save({ validateBeforeSave: false });
  
    res.status(200).json({
      status: 'success',
      data: {
        favorites: user.favorites
      }
    });
  });


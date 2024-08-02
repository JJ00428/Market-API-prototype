const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');

const AppError = require('./../utils/appError');
const User = require('./../models/userModel');
const Order = require('./../models/OrderModel');
const Product = require('./../models/productModel');
const APIFeatures = require('./../utils/apiFeatures');





const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach(el => {
      if (allowedFields.includes(el)) newObj[el] = obj[el];
    });
    return newObj;
};


exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};


exports.updateMe = catchAsync( async (req, res, next) => {
    // Give error if user POSTs password data
    if (req.body.password || req.body.passwordConfirm) {
        return next(new AppError('This route is not for password updates. Please use /updateMyPassword. 🔑🚫',400));
    }

    // Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body,'username', 'email', 'address');

    // Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, { active: false });
  
    res.status(204).json({
      status: 'success',
      data: null
    });
  });




exports.getAllUsers = factory.getAll(User);

exports.getUser = factory.getOne(User);

//Don't Update Passwords with this!! :
exports.updateUser = factory.updateOne(User);

exports.deleteUser = factory.deleteOne(User);


exports.getCart = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate({
    path: 'cart.product',
    model: 'Product',
    select: "name description image cover seller"
  });

  // Debugging: Log the retrieved user data
  // console.log('User with populated cart:', JSON.stringify(user, null, 2));

  if (!user) {
    return next(new AppError('User not found 🚫', 404));
  }

  res.status(200).json({
    status: 'success',
    cart: user.cart
  });
});

exports.getFavs = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate({
    path: 'favorites',
    model: 'Product',
    select: "name description image cover seller"
  });

  if (!user) {
    return next(new AppError('User not found 🚫', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      favorites: user.favorites
    }
  });
});



exports.order = catchAsync(async (req, res, next) => {
  const { paymentMethod, cardNumber, cardPass, notes } = req.body;

  // Find the user and populate the cart with product details
  const user = await User.findById(req.user.id).populate({
    path: 'cart.product',
    select: 'name price description'
  });

  if (!user || user.cart.length === 0) {
    return next(new AppError('No items in the cart to order 🛒❌', 400));
  }

  const totalPrice = user.cart.reduce((acc, item) => {
    // console.log(`Product Price: ${item.product.price}, Quantity: ${item.quantity}`);

    if (item.product) {
      return acc + (item.product.priceDiscount ?? item.product.price) * item.quantity;
    }
    return acc;
  }, 0);

  // console.log(totalPrice);

  // Payment method validation
  if (paymentMethod === 'credit') {
    if (!cardNumber || !cardPass) {
      return next(new AppError('Credit card details are required 💳❗', 400));
    }

    //real payment gateway for processing the payment
    // For demonstration, assume payment is successful

  } else if (paymentMethod !== 'cash on delivery') {
    return next(new AppError('Invalid payment method ❌', 400));
  }

  const products = await Promise.all(user.cart.map(async item => {
    const product = await Product.findById(item.product._id);
    return {
      product: product._id,
      quantity: item.quantity,
      price: product.price,
      priceDiscount: product.priceDiscount,
      seller: product.seller
    };
  }));


  //from cgpt
  // const sellers = [...new Set(user.cart.map(item => item.product.seller))];

  const newOrder = await Order.create({
    costumer: req.user.id,
    products,
    totalPrice,
    Notes: notes,
    status: 'pending',
    date: Date.now(),
    payment: paymentMethod
    // ,sellers
  });



  // Update product quantities
  for (const item of user.cart) {
    if (item.product) {
      const product = await Product.findById(item.product._id);
      // console.log(product.quantity);
      if (product) {
        product.quantity -= item.quantity;
        if (product.quantity < 0) {
          product.quantity = 0;  // Prevent negative quantities
        }
        await product.save({ validateBeforeSave: false });
        // console.log(product.quantity);

      }
    }
  }


  // Clear the user's cart
  user.cart = [];
  await user.save({ validateBeforeSave: false });

  res.status(201).json({
    status: 'success',
    data: {
      order: newOrder
    }
  });
});


exports.getAllOrders = catchAsync(async (req, res, next) => {
  // console.log(req.user.id);


  let query = Order.find({ costumer: req.user.id }).populate('products.product').select('-costumer -sellers');

  // Apply filtering, sorting, limiting fields, and pagination
  const features = new APIFeatures(query, req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  // Execute the query
  const orders = await features.query;

  // Send the response
  res.status(200).json({
    status: 'success',
    results: orders.length,
    orders
  });
});

exports.getCostumerOrders = catchAsync(async (req, res, next) => {

  let query = Order.find({ costumer: req.params.id }).populate('products.product').select('-costumer -sellers');

  // Apply filtering, sorting, limiting fields, and pagination
  const features = new APIFeatures(query, req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  // Execute the query
  const orders = await features.query;

  // Send the response
  res.status(200).json({
    status: 'success',
    results: orders.length,
    orders
  });
});
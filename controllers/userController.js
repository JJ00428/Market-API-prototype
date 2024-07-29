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
    model: 'Product'
    // select: "__v"
  });

  // Debugging: Log the retrieved user data
  // console.log('User with populated cart:', JSON.stringify(user, null, 2));

  if (!user) {
    return next(new AppError('User not found 🚫', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      cart: user.cart
    }
  });
});

exports.getFavs = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate({
    path: 'favorites',
    model: 'Product'
    // select: "__v"
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
    select: 'price seller'
  });

  if (!user || user.cart.length === 0) {
    return next(new AppError('No items in the cart to order 🛒❌', 400));
  }

  const totalPrice = user.cart.reduce((acc, item) => {
    // console.log(`Product Price: ${item.product.price}, Quantity: ${item.quantity}`);

    if (item.product) {
      return acc + item.product.price * item.quantity;
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

  const products = user.cart.map(item => ({
    product: item.product._id,
    quantity: item.quantity
  }));

  //from cgpt
  const sellers = [...new Set(user.cart.map(item => item.product.seller))];

  const newOrder = await Order.create({
    costumer: req.user.id,
    products,
    totalPrice,
    Notes: notes,
    status: 'pending',
    date: Date.now(),
    payment: paymentMethod,
    sellers
  });

  // Add order ID to the seller's orders list
  for (const item of user.cart) {
    if (item.product) {
      await User.findByIdAndUpdate(item.product.seller, {
        $push: { orders: newOrder._id }
      });
    }
  }


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

  await User.findByIdAndUpdate(req.user.id, {
    $push: { orders: newOrder._id }
  });

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
  
  const user = await User.findById(req.user.id).populate({
      path: 'orders',
      select: '-costumer'
  });

  if (!user) {
      return next(new AppError('User not found 🔍', 404));
  }

  // Create a query object for the populated orders (from cgpt)
  let query = Order.find({ _id: { $in: user.orders } });

  const features = new APIFeatures(query, req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

  const orders = await features.query;

  res.status(200).json({
      status: 'success',
      results: orders.length,
      orders
     
  });
});

exports.getCostumerOrders = catchAsync(async (req, res, next) => {
  
  const user = await User.findById(req.params.id).populate({
      path: 'orders',
      select: '-costumer'
  });

  if (!user) {
      return next(new AppError('User not found 🔍', 404));
  }

  // Create a query object for the populated orders (from cgpt)
  let query = Order.find({ _id: { $in: user.orders } });

  const features = new APIFeatures(query, req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

  const orders = await features.query;

  res.status(200).json({
      status: 'success',
      results: orders.length,
      orders
     
  });
});
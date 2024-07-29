const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');

const AppError = require('./../utils/appError');
const User = require('./../models/userModel');
const Order = require('./../models/OrderModel');
const Product = require('./../models/productModel');
const APIFeatures = require('./../utils/apiFeatures');


exports.getOrder = catchAsync(async (req, res, next) => {
    
    const order = await Order.findById(req.params.id);
  
    if (!order) {
      return next(new AppError('Order not found 🔍🛒', 404));
    }

    const user = await User.findById(req.user.id);

    const isSeller = order.sellers.some(seller => seller.toString() === user._id.toString());
    
    if (user.role !== 'Admin' && !isSeller && order.costumer._id.toString() !== user._id.toString()) {
        return next(new AppError('You do not have permission to view this order 📵', 403));
    }
  
    res.status(200).json({
      status: 'success',
      data: {
        status: order
      }
    });
  });

exports.updateStatus = catchAsync(async (req, res, next) => {
    
    const order = await Order.findById(req.params.id);
  
    if (!order) {
      return next(new AppError('Order not found 🔍🛒', 404));
    }

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    const user = await User.findById(req.user.id);

    if (user.role !== 'Admin') {
        if (!order.sellers.includes(user._id)) {
            return next(new AppError('You do not have permission to update this order 📵', 403));
        }
    }
    
    if (!validStatuses.includes(req.body.status)) {
        return next(new AppError('Invalid status value, pick from [pending, processing, shipped, delivered, cancelled] 📝❌', 400));
    }

    order.status = req.body.status;
    await order.save({ validateBeforeSave: false });
  
    res.status(200).json({
      status: 'success',
      data: {
        status: order
      }
    });
  });

exports.cancelOrder = catchAsync(async (req, res, next) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
        return next(new AppError('Order not found 🔍🛒', 404));
    }

    const user = await User.findById(req.user.id);

    const isSeller = order.sellers.some(seller => seller.toString() === user._id.toString());

    // console.log(order.costumer._id);
    // console.log(user._id);
    
    if (user.role !== 'Admin' && !isSeller && order.costumer._id.toString() !== user._id.toString()) {
        return next(new AppError('You do not have permission to cancel this order 📵', 403));
    }

    // Check if the user is a seller and needs to remove a product
    if (isSeller) {
        const productToRemove = req.body.productId;
        if (productToRemove) {
            // Remove the product from the order and update notes

            // const totalPrice = user.cart.reduce((acc, item) => {
            //     // console.log(`Product Price: ${item.product.price}, Quantity: ${item.quantity}`);
            
            //     if (item.product) {
            //       return acc + item.product.price * item.quantity;
            //     }
            //     return acc;
            //   }, 0);


            const productRemoved = await Product.findById(productToRemove);
            const item1 = order.products.find( item => item.product.toString() === productToRemove.toString() );
            
            
            if (productRemoved) {
                // console.log(productRemoved.quantity);
                // console.log(item1.quantity);
                productRemoved.quantity += item1.quantity;
                await productRemoved.save({ validateBeforeSave: false });
            }

            
            
            order.products = order.products.filter(item => item.product.toString() !== productToRemove);
            order.Notes = `${order.Notes || ''} \n Product ${productToRemove} was removed by seller.`;
        

            let finalPrice = 0;
            for (const item of order.products) {
                const product = await Product.findById(item.product);
                if (product) {
                    finalPrice += product.price * item.quantity;
                }
            }
            order.totalPrice = finalPrice;

            await order.save({ validateBeforeSave: false });
            

            // If the order isn't empty after product removal
            if (!(order.products.length === 0)) {
                await order.save({ validateBeforeSave: false });
                return res.status(200).json({
                    status: 'success',
                    data: {
                        message: 'Product removed from the order and order updated',
                        order
                    }
                });
            }
        }
    }

    // Cancel the order
    if (order.status === 'cancelled') {
        return next(new AppError('Order is already cancelled 🚫', 400));
    }

    order.status = 'cancelled';
    await order.save({ validateBeforeSave: false });

    // Restore product quantities in stock
    for (const item of order.products) {
        const product = await Product.findById(item.product);

        if (product) {
            product.quantity += item.quantity;
            await product.save({ validateBeforeSave: false });
        }
    }

    // Process refund if payment method was 'credit'
    if (order.payment === 'credit') {
        // Simulate refund process
        console.log('Refunded money');
    }

    res.status(200).json({
        status: 'success',
        data: {
            message: 'Order has been cancelled and stock has been restored',
            order: {
                id: order._id,
                status: order.status
            }
        }
    });
});

exports.getAllOrders = catchAsync(async (req, res, next) => {
    
    const userRole = req.user.role;
    const userId = req.user.id;

    let filter = {};

    if (userRole === 'Seller') {
        filter.sellers = { $in: [userId] };
    }

    if (req.params.productId) {
        filter.product = req.params.productId;
    }

    const features = new APIFeatures(Order.find(filter), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate();

    const doc = await features.query;

    res.status(200).json({
        status: 'success',
        results: doc.length,
        data: doc
        
    });
});
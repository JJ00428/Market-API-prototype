const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const catchAsync = require('./../utils/catchAsync');

const sendEmail = require('./../utils/email');

const User = require('./../models/userModel');
const AppError = require('./../utils/appError');

const signToken =  id => {
    return jwt.sign({id:id}, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
}

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);
    const cookieOptions = {
        //browser will delete cookie after it has expired
        expires: new Date( 
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
      ),
      httpOnly: true
    };
    if (process.env.NODE_ENV === 'production') 
        cookieOptions.secure = true;
    
    res.cookie('jwt', token, cookieOptions);
    // Remove password from output
    user.password = undefined;
  
    res.status(statusCode).json({
      status: 'success',
      token,
      data: {
        user
      }
    });
  };

exports.signup = catchAsync(async (req, res, next) => {
    let activitiy;
    if (req.body.role === 'Seller') {
        // return next(new AppError('Admins are not allowed to register!', 403));
        activitiy = false;
    } else {
        activitiy = true;
    }

    const newUser = await User.create({
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        role: req.body.role,
        active: activitiy,
        address: req.body.address,
        certificate: req.body.certificate,
        passwordChangedAt: Date.now()
    });


    createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    // console.log(email, password);

    if (!email ||!password) {
        return next(new AppError('Please provide email and password! 📛', 400));
    }

    //Check if user exists and password is correct 
    const user = await User.findOne({ email: email}).select('+password');


    if(!user || !(await user.correctPassword(password, user.password))){
        return next(new AppError('Incorrect email or password ❌', 401));
    }

    // send token to client

    createSendToken(user, 200, res);

});

exports.protect = catchAsync(async (req, res, next) => {
    //Check if token exists and get it
    let token;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    if(!token){
        return next(new AppError('You are not logged in! Please log in ❌', 401));
    }
    
    //Verify the token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    //Check if user still exists
    const newUser = await User.findById(decoded.id);
    if (!newUser) {
        return next(new AppError('The user belonging to this token does no longer exist ❌',401));
    }

    //If user changes password after the token was issued
    if (!newUser.changedPasswordAfter(decoded.iat)) {
        // console.log(decoded);
        return next(new AppError('User recently changed password! Please log in again ❌', 401));
      }
    
    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = newUser;
     
    next();
});

exports.isActive = catchAsync(async (req, res, next) => {
    // console.log(req.user.active);
    if(req.user.active === false && req.user.role === 'Seller'){
        return next(new AppError('Your account has not yet been verified! Please contact support! 🪪🚫', 403));
    } else if(req.user.active === false ){
        return next(new AppError('Your account has been deactivated! Please contact support! 👤🚫', 403));
    }
    next();
});

exports.AllowSeller = catchAsync( async (req, res, next) => {
    const sellerToAccept = await User.findById(req.params.id);
    
    if (!sellerToAccept) {
      return next(new AppError('No user found with that ID👤❌', 404));
    }
  
    if (!sellerToAccept.role ==='Seller') {
      return next(new AppError('This user is not a Seller 🛒❌', 403));
    }
    sellerToAccept.active = true;
    const data = await sellerToAccept.save({ validateBeforeSave: false });
   return res.status(200).json({
    status: 'success',
    data: {
        message: 'Seller Accepted',
        data
    }
});
  
  });

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to access this route ❌', 403));
        }
        next();
    };
};



exports.forgotPassword = catchAsync(async (req, res, next) => { 
    // Get user based on POSTed email
    const user = await User.findOne({ email: req.body.email });

    // if email does not exist
    if (!user) {
        return next(new AppError('There is no user with email address 📧❌', 404));
    }

    // Generate the random token for reset
    const resetToken = user.createPasswordResetToken();

    //because we only modified it not saved it
    //because no name ..etc that are required, then close validations
    await user.save({ validateBeforeSave: false });

    // Send token to user's email
    const resetURL = `${req.protocol}://${req.get('host')}/marketAPI/v1/users/resetPassword/${resetToken}`;

    const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL} 🔑.\nIf you didn't forget your password, please ignore this email!`;

    try {
        await sendEmail({
          email: user.email,
          subject: 'Your password reset token (valid for 10 min) 🔑🕑',
          message
        });
    
        res.status(200).json({
          status: 'success',
          message: 'Token sent to email!'
        });
      } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
    
        return next(
          new AppError('There was an error sending the email. Try again later! ❌'),500);
      }
});

exports.resetPassword = catchAsync(async (req, res, next) => {

    // get user by token
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() }});

    // set new password if token isn't expired and there is a user
    if (!user) {
        return next(new AppError('Token is invalid or expired. Please try again.', 400));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();


    // update changedPasswordAt property for user

    // log user in , sent jwt

    createSendToken(user, 200, res);

});

exports.updatePassword = catchAsync(async (req, res , next) => {
    //Get user from collection
    const user = await User.findById(req.user.id).select('+password');


    //check if Posted password is correct
    if(!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
        return next(new AppError('Your current password is wrong. 🔑❌', 401));
    }

    //if all is good, update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save(); 
    //User.findbyIdAndUpdate Won't work for the validation and pre middleware!

    //log user in, send jwt
    createSendToken(user, 200, res);

});

// exports.fixUser = catchAsync(async (req, res , next) => {
//     const user = await User.findById(req.user.id);
    
//     if (user.role === 'Admin' || user.role === 'Seller') {
//         delete user.favorites;
//         delete user.cart;
//     }

//     user.save({ validateBeforeSave: false });
// });
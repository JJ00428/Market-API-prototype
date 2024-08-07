const catchAsync = require('../utils/catchAsync');

const AppError = require('../utils/appError');
const { v4: uuidv4 } = require('uuid');

const multer = require('multer');
const sharp = require('sharp');

const User = require('../models/userModel');
const Product = require('../models/productModel');


const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('We Only Accept Images Here, This is not an image 📷', 400), false);
  }
};


const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadUserPhoto =  catchAsync(async (req, res, next) => { 
  upload.single('photo');
  // console.log(`req.file: ${req.file} req.body: ${JSON.stringify(req.body)}`);
 });

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  //their will be a problem here 😭
  const uniqueImageId = uuidv4();
  req.file.photo = `user-${uniqueImageId}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});



exports.uploadAllImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 4 },
  { name: 'photo', maxCount: 1 }
]);



exports.resizeAllImages = catchAsync(async (req, res, next) => {
  if (!req.files) {
    return next();
  }

  if (req.files.imageCover && req.files.images) {
    const uniqueCoverId = uuidv4();
    req.body.imageCover = `product-${uniqueCoverId}-cover.jpeg`;

    await sharp(req.files.imageCover[0].buffer)
      .resize(1280, 720)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(`public/img/products/${req.body.imageCover}`);

    req.body.images = [];
    
    await Promise.all(
      req.files.images.map(async (file, i) => {
        const uniqueImageId = uuidv4();
        const filename = `product-${uniqueImageId}-${i + 1}.jpeg`;

        await sharp(file.buffer)
          .resize(1280, 720)
          .toFormat('jpeg')
          .jpeg({ quality: 90 })
          .toFile(`public/img/products/${filename}`);

        req.body.images.push(filename);
      }),
    );
  }

  if (req.files.photo) {
    const uniquePhotoId = uuidv4();
    req.body.photo = `user-${uniquePhotoId}.jpeg`;

    await sharp(req.files.photo[0].buffer)
      .resize(500, 500)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(`public/img/users/${req.body.photo}`);
  }

  next();
});

exports.setImages = catchAsync(async (req, res , next) => {
  let user, product;

  if (req.user) {
    user = await User.findById(req.user.id);
  }

  if (req.params.productId) {
    product = await Product.findById(req.params.productId);
  }

  if (product) {
    product.imageCover = req.body.imageCover;
    product.images = req.body.images;
    await product.save({ validateBeforeSave: false });
  } else if (user) {
    user.photo = req.body.photo;    
    await user.save({ validateBeforeSave: false });
  } else {
    return next();
  }

  res.status(200).json({
    status: 'success',
    data: product || user
  });
});


exports.uploadImages = catchAsync(async (req, res, next) => {

  if (!req.files) {
    return next(new AppError('No images found to upload! 📷', 400));
  }

  switch (req.user.role) {
    case 'Admin':
    case 'Consumer':
      // await this.uploadUserPhoto(req, res, next);
      await this.resizeUserPhoto(req, res, next);
      break;
    case 'Seller':
      if (req.files.length > 1) {
        // await this.uploadProductImages(req, res, next);
        await this.resizeProductImages(req, res, next);
      } else {
        // await this.uploadUserPhoto(req, res, next);
        await this.resizeUserPhoto(req, res, next);
      }
      break;
    default:
      return next(new AppError('User role not recognized!', 400));
  }

  // res.status(200).json({
  //   status: 'success',
  //   data: {
  //     message: 'Images uploaded successfully',
  //     // images: req.files.map(file => ({ filename: file.filename })),
  //   }
  // });
});

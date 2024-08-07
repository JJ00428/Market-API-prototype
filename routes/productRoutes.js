const express = require("express");
const productController = require("./../controllers/productController");
const authController = require("./../controllers/authController");
const joiController = require("./../controllers/joiController");
const multerController = require("../controllers/multerController");

// const reviewRouter = require('./../routes/reviewRoutes');

const router = express.Router();

// router.use('/:productId/reviews', reviewRouter);

router.use(authController.protect);
router.use(authController.isActive);

router
  .route("/")
  .get(productController.getAllProducts)
  .post(
    [
      authController.restrictTo("Admin", "Seller"),
      joiController.createProductJoi,
      // multerController.uploadProductImages,
      // multerController.resizeProductImages,
    ],
    productController.createProduct
  );

router
  .route("/:id")
  .get(productController.getProduct)
  .patch(
    authController.restrictTo("Admin", "Seller"),
    // multerController.uploadAllImages,
    // multerController.resizeProductImages,
    productController.updateProduct
  )
  .post(authController.restrictTo("Consumer"), productController.addToCart)
  .delete(
    authController.restrictTo("Admin", "Seller"),
    productController.deleteProduct
  );

router.route("/:id/favorite").get(productController.favoriteItem);

module.exports = router;

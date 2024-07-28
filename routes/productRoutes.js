const express = require("express");
const productController = require('./../controllers/productController');
const authController = require("./../controllers/authController");
// const reviewRouter = require('./../routes/reviewRoutes');

const router = express.Router();

// router.use('/:productId/reviews', reviewRouter);

router
  .route("/")
  .get(productController.getAllProducts)
  .post(
    authController.protect,
    authController.restrictTo("Admin", "Seller"),
    productController.createProduct
  );

router
  .route("/:id")
  .get(productController.getProduct)
  .patch(
    authController.protect,
    authController.restrictTo("Admin", "Seller"),
    productController.updateProduct
  )
  .post(
    authController.protect,
    authController.restrictTo("Consumer"),
    productController.addToCart
  )
  .delete(
    authController.protect,
    authController.restrictTo("Admin", "Seller"),
    productController.deleteProduct
  );

router
  .route("/:id/favorite")
  .get(authController.protect, productController.favoriteItem);

module.exports = router;

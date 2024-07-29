const express = require("express");
const orderController = require("./../controllers/orderController");
const authController = require("./../controllers/authController");

const router = express.Router();

////After this , all protected: ////
router.use(authController.protect);

router
  .route("/:id")
  .get(orderController.getOrder)
  .patch(
    authController.restrictTo("Admin", "Seller"),
    orderController.updateStatus
  )
  .delete(orderController.cancelOrder);

router.route("/").get(authController.restrictTo("Admin", "Seller"),orderController.getAllOrders);

module.exports = router;

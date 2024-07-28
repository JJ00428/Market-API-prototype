const express = require("express");
const userController = require("./../controllers/userController");
const authController = require("./../controllers/authController");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);

router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);

////After this , all protected: ////
router.use(authController.protect);

router.patch("/updateMyPassword", authController.updatePassword);

router.get("/MyAccount", userController.getMe, userController.getUser);
router.patch("/updateMe", userController.updateMe);
router.delete("/deleteMe", userController.deleteMe);

//order all what's in the cart
// router.get('/order',authController.restrictTo('Consumer'), userController.Purchase);

//view Past Purchases
// router.get('/pastPurchases', authController.restrictTo('Consumer'), userController.getPastPurchases);

//view Cart
router
  .route("/cart")
  .get(authController.restrictTo("Consumer"), userController.getCart)
  .post(authController.restrictTo("Consumer"), userController.order);

//view Favorite Items
router.get(
  "/favorites",
  authController.restrictTo("Consumer"),
  userController.getFavs
);

//// After this is all is restricted to admin: ////
router.use(authController.restrictTo("Admin"));

router.route("/").get(userController.getAllUsers);

router
  .route("/:id")
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;

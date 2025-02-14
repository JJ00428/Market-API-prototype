const express = require("express");
const userController = require("./../controllers/userController");
const authController = require("./../controllers/authController");
const joinController = require("./../controllers/joiController");
const multerController = require("../controllers/multerController");


const router = express.Router();

router.post(
  "/signup",
  joinController.createUserJoi,
  // multerController.uploadUserPhoto,
  // multerController.resizeUserPhoto,
  authController.signup
  // ,authController.fixUser
);
router.post("/login", authController.login);

router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);

////After this , all protected: ////
router.use(authController.protect);
router.use(authController.isActive);

router.post("/uploadImages", [multerController.uploadAllImages, multerController.resizeAllImages] , multerController.setImages);


router.patch("/updateMyPassword", authController.updatePassword);

router.get("/MyAccount", userController.getMe, userController.getUser);
router.patch(
  "/updateMe",
  // multerController.uploadUserPhoto,
  // multerController.resizeUserPhoto,
  userController.updateMe
);
router.delete("/deleteMe", userController.deleteMe);

router.get(
  "/MyOrders",
  authController.restrictTo("Consumer"),
  userController.getAllOrders
);
router.get(
  "/:id/orders",
  authController.restrictTo("Admin"),
  userController.getCostumerOrders
);

router
  .route("/cart")
  .get(authController.restrictTo("Consumer"), userController.getCart)
  .post(authController.restrictTo("Consumer"), userController.order);

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

router.route("/allowSeller/:id").get(authController.AllowSeller);

module.exports = router;

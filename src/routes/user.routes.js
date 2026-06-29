import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  registerUser,
  verifyEmail,
  loginUser,
  getCurrentUser,
  refreshAccessToken,
  logoutUser,
  forgotPassword,
  resetPassword,
  changePassword,
  deleteAccount,
  updateProfile,
} from "../controllers/user.controller.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/verify-email/:token").get(verifyEmail);
router.route("/login").post(loginUser);
router.route("/me").get(verifyJWT, getCurrentUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password/:token").post(resetPassword);
router.route("/change-password").post(verifyJWT, changePassword);
router.route("/delete-account").delete(verifyJWT, deleteAccount);
router
  .route("/profile")
  .patch(verifyJWT, upload.single("avatar"), updateProfile);

export default router;

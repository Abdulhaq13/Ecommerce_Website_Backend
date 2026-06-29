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
import { validate } from "../middlewares/validate.middleware.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "../validators/user.validator.js";

const router = Router();

router.route("/register").post(validate(registerSchema), registerUser);
router.route("/verify-email/:token").get(verifyEmail);
router.route("/login").post(validate(loginSchema), loginUser);
router.route("/me").get(verifyJWT, getCurrentUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/logout").post(verifyJWT, logoutUser);
router
  .route("/forgot-password")
  .post(validate(forgotPasswordSchema), forgotPassword);
router
  .route("/reset-password/:token")
  .post(validate(resetPasswordSchema), resetPassword);
router
  .route("/change-password")
  .post(verifyJWT, validate(changePasswordSchema), changePassword);
router.route("/delete-account").delete(verifyJWT, deleteAccount);
router
  .route("/profile")
  .patch(verifyJWT, upload.single("avatar"), updateProfile);

export default router;

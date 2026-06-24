import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  registerUser,
  verifyEmail,
  loginUser,
  getCurrentUser,
} from "../controllers/user.controller.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/verify-email/:token").get(verifyEmail);
router.route("/login").post(loginUser);
router.route("/me").get(verifyJWT, getCurrentUser);
router.route("/refresh-token").post(refreshAccessToken);

export default router;

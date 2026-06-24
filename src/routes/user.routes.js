import { Router } from "express";
import {
  registerUser,
  verifyEmail,
  loginUser,
} from "../controllers/user.controller.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/verify-email/:token").get(verifyEmail);
router.route("/login").post(loginUser);

export default router;

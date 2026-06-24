import { Router } from "express";
import { registerUser, verifyEmail } from "../controllers/user.controller.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/verify-email/:token").get(verifyEmail);

export default router;

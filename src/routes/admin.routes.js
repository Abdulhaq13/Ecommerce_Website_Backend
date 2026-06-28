import { Router } from "express";
import {
  getAllUsers,
  deleteUser,
  reactivateUser,
  changeUserRole,
} from "../controllers/admin.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/role.middleware.js";

const router = Router();

// Every admin route requires a logged-in admin — applied once at the
// router level instead of repeating both middlewares on each route.
router.use(verifyJWT, isAdmin);

router.route("/users").get(getAllUsers);
router.route("/users/:userId/deactivate").patch(deleteUser);
router.route("/users/:userId/reactivate").patch(reactivateUser);
router.route("/users/:userId/role").patch(changeUserRole);

export default router;

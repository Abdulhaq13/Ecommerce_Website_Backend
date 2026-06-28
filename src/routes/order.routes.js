import { Router } from "express";
import {
  placeOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
} from "../controllers/order.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/role.middleware.js";

const router = Router();

// Every order route requires a logged-in user.
router.use(verifyJWT);

// Customer routes
router.route("/").post(placeOrder);
router.route("/my-orders").get(getMyOrders);
router.route("/:orderId").get(getOrderById);
router.route("/:orderId/cancel").patch(cancelOrder);

// Admin routes
router.route("/").get(isAdmin, getAllOrders);
router.route("/:orderId/status").patch(isAdmin, updateOrderStatus);

export default router;

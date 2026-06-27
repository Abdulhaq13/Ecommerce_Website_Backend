import { Router } from "express";
import {
  addToCart,
  getCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
} from "../controllers/cart.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Apply verifyJWT middleware globally to all routes below
router.use(verifyJWT);

router.route("/").post(addToCart).get(getCart).delete(clearCart);

router
  .route("/:productId")
  .patch(updateCartItemQuantity)
  .delete(removeCartItem);

export default router;

import { Router } from "express";
import {
  addToCart,
  getCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
} from "../controllers/cart.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  addToCartSchema,
  updateCartItemQuantitySchema,
} from "../validators/cart.validator.js";

const router = Router();

// Apply verifyJWT middleware globally to all routes below
router.use(verifyJWT);

router
  .route("/")
  .post(validate(addToCartSchema), addToCart)
  .get(getCart)
  .delete(clearCart);

router
  .route("/:productId")
  .patch(validate(updateCartItemQuantitySchema), updateCartItemQuantity)
  .delete(removeCartItem);

export default router;

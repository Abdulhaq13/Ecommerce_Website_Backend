import { Router } from "express";
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/role.middleware.js";
import { optionalAuth } from "../middlewares/optionalAuth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router
  .route("/")
  .get(getAllProducts)
  .post(verifyJWT, isAdmin, upload.array("images", 5), createProduct);

router
  .route("/:id")
  .get(optionalAuth, getProductById)
  .patch(verifyJWT, isAdmin, upload.array("images", 5), updateProduct)
  .delete(verifyJWT, isAdmin, deleteProduct);

export default router;

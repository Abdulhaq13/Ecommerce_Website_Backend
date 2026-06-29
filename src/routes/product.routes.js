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
import { validate } from "../middlewares/validate.middleware.js";
import {
  createProductSchema,
  updateProductSchema,
} from "../validators/product.validator.js";

const router = Router();

router
  .route("/")
  .get(getAllProducts)
  .post(
    verifyJWT,
    isAdmin,
    upload.array("images", 5),
    validate(createProductSchema),
    createProduct,
  );

router
  .route("/:id")
  .get(optionalAuth, getProductById)
  .patch(
    verifyJWT,
    isAdmin,
    upload.array("images", 5),
    validate(updateProductSchema),
    updateProduct,
  )
  .delete(verifyJWT, isAdmin, deleteProduct);

export default router;

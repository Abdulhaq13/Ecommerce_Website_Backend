import { Router } from "express";

import {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../validators/category.validator.js";

const router = Router();
router.route("/").get(getAllCategories);
router
  .route("/")
  .post(verifyJWT, isAdmin, validate(createCategorySchema), createCategory);

router
  .route("/:id")
  .patch(verifyJWT, isAdmin, validate(updateCategorySchema), updateCategory)
  .delete(verifyJWT, isAdmin, deleteCategory);

export default router;

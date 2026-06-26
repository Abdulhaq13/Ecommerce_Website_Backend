import { Router } from "express";

import {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/role.middleware.js";

const router = Router();
router.route("/").get(getAllCategories);
router.route("/").post(verifyJWT, isAdmin, createCategory);

router
  .route("/:id")
  .patch(verifyJWT, isAdmin, updateCategory)
  .delete(verifyJWT, isAdmin, deleteCategory);

export default router;

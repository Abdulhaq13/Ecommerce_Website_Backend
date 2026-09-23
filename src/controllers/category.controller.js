import { Category } from "../models/category.model.js";
import { Product } from "../models/product.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const createCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === "") {
    throw new ApiError(400, "Category name is required");
  }

  const existingCategory = await Category.findOne({ name: name.trim() });
  if (existingCategory) {
    throw new ApiError(409, "Category with this name already exists");
  }

  const category = await Category.create({
    name: name.trim(),
    createdBy: req.user._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, category, "Category created successfully"));
});

const getAllCategories = asyncHandler(async (req, res) => {
  // Admins can ask for hidden categories too (for the admin category list).
  const isAdmin = req.user?.role === "admin";
  const filter = isAdmin && req.query.includeInactive === "true" ? {} : { isActive: true };
  const categories = await Category.find(filter).sort({ name: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, categories, "Categories fetched successfully"));
});

const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, isActive } = req.body;

  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  if (name !== undefined) {
    const trimmedName = name.trim();
    if (trimmedName === "") {
      throw new ApiError(400, "Category name cannot be empty");
    }

    const existingCategory = await Category.findOne({
      name: trimmedName,
      _id: { $ne: id },
    });

    if (existingCategory) {
      throw new ApiError(409, "Category with this name already exists");
    }

    category.name = trimmedName;
  }

  if (isActive !== undefined) {
    category.isActive = isActive;
  }

  await category.save();
  return res
    .status(200)
    .json(new ApiResponse(200, category, "Category updated successfully"));
});

const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  const productCount = await Product.countDocuments({ category: id });
  if (productCount > 0) {
    throw new ApiError(
      400,
      `Cannot delete category: ${productCount} product(s) still reference it`,
    );
  }

  await Category.findByIdAndDelete(id);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Category deleted successfully"));
});

export { createCategory, getAllCategories, updateCategory, deleteCategory };

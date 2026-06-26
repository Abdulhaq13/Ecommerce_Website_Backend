import { Product } from "../models/product.model.js";
import { Category } from "../models/category.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinaryUpload.js";

const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, category, stock } = req.body;
  if (
    !name?.trim() ||
    !description?.trim() ||
    price === undefined ||
    !category ||
    stock === undefined
  ) {
    throw new ApiError(
      400,
      "Name, description, price, category, and stock are required",
    );
  }

  if (price < 0 || stock < 0) {
    throw new ApiError(400, "Price and stock cannot be negative");
  }

  const categoryExists = await Category.findById(category);
  if (!categoryExists) {
    throw new ApiError(404, "Category not found");
  }

  const uploadedImages = [];
  if (req.files && req.files.length > 0) {
    try {
      for (const file of req.files) {
        const result = await uploadOnCloudinary(
          file.path,
          "ecommerce-app/products",
        );
        uploadedImages.push({
          public_id: result.public_id,
          url: result.secure_url || result.url,
        });
      }
    } catch (error) {
      for (const image of uploadedImages) {
        await deleteFromCloudinary(image.public_id);
      }
      throw new ApiError(500, "Failed to upload product images");
    }
  }

  const product = await Product.create({
    name: name.trim(),
    description: description.trim(),
    price,
    category,
    stock,
    images: uploadedImages,
    createdBy: req.user._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(201, "Product created successfully"));
});

export const { createProduct };

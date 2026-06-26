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
    for (const file of req.files) {
      const result = await uploadOnCloudinary(
        file.path,
        "ecommerce-app/products",
      );

      if (!result) {
        for (const image of uploadedImages) {
          await deleteFromCloudinary(image.public_id);
        }
        throw new ApiError(500, "Failed to upload product images");
      }
      uploadedImages.push({
        public_id: result.public_id,
        url: result.url,
      });
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

const getAllProducts = asyncHandler(async (req, res) => {
  const {
    search,
    category,
    minPrice,
    maxPrice,
    rating,
    sort,
    page = 1,
    limit = 10,
  } = req.query;

  const filter = { isActive: true };

  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  if (category) {
    filter.category = category;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
    if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
  }

  if (rating !== undefined) {
    filter.ratingsAverage = { $gte: Number(rating) };
  }

  let sortOption = { createdAt: -1 }; //default newest first
  if (sort === "price_asc") {
    sortOption = { price: 1 };
  } else if (sort === "price_desc") {
    sortOption = { price: -1 };
  } else if (sort === "newest") {
    sortOption = { createdAt: -1 };
  }

  const pageNumber = Math.max(1, Number(page));
  const limitNumber = Math.max(1, Number(limit));
  const skip = (pageNumber - 1) * limitNumber;

  const [products, totalProducts] = await Promise.all([
    Product.find(filter)
      .populate("category", "name slug")
      .sort(sortOption)
      .skip(skip)
      .limit(limitNumber),
    Product.countDocuments(filter), // count how many total products match the filter
  ]);

  const totalPages = Math.ceil(totalProducts / limitNumber);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        products,
        pagination: {
          totalProducts,
          totalPages,
          currentPage: pageNumber,
          limit: limitNumber,
        },
      },
      "Products fetched successfully",
    ),
  );
});

const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id).populate("category", "name slug"); // mongoose version of join statement

  const isRequesterAdmin = req.user && req.user.role === "admin";

  if (!product || (!product.isActive && !isRequesterAdmin)) {
    throw new ApiError(404, "Product not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, product, "Product fetched successfully"));
});

const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    price,
    category,
    stock,
    isActive,
    removeImagePublicIds, // array of public_ids the admin wants to delete
  } = req.body;

  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (name !== undefined) {
    if (!name.trim()) throw new ApiError(400, "Product name cannot be empty");
    product.name = name.trim();
  }

  if (description !== undefined) {
    if (!description.trim())
      throw new ApiError(400, "Product description cannot be empty");
    product.description = description.trim();
  }

  if (price !== undefined) {
    if (price < 0) throw new ApiError(400, "Price cannot be negative");
    product.price = price;
  }

  if (stock !== undefined) {
    if (stock < 0) throw new ApiError(400, "Stock cannot be negative");
    product.stock = stock;
  }

  if (category !== undefined) {
    const categoryExists = await Category.findById(category);
    if (!categoryExists) throw new ApiError(404, "Category not found");
    product.category = category;
  }

  if (isActive !== undefined) {
    product.isActive = isActive;
  }

  // --- Handle image removal first (before adding new ones) ---
  if (removeImagePublicIds) {
    const idsToRemove = Array.isArray(removeImagePublicIds)
      ? removeImagePublicIds
      : [removeImagePublicIds];

    for (const publicId of idsToRemove) {
      await deleteFromCloudinary(publicId);
    }

    product.images = product.images.filter(
      //Keep every image except the ones whose public_id is inside our idsToRemove list."
      (image) => !idsToRemove.includes(image.public_id), //"!" instead of finding what to delete, it tells the filter what to keep.
    );
  }

  // --- Handle new image uploads (appended, not replacing existing ones) --

  if (req.files && req.files.length > 0) {
    // Check the cap BEFORE uploading anything, so we don't waste an
    // upload to Cloudinary only to reject the request afterwards
    const totalAfterUpload = product.images.length + req.files.length;

    if (totalAfterUpload > 5) {
      throw new ApiError(
        400,
        `Cannot add ${req.files.length} image(s): product already has ${product.images.length}, and the limit is 5`,
      );
    }
    const newlyUploadedImages = [];

    for (const file of req.files) {
      const result = await uploadOnCloudinary(
        file.path,
        "ecommerce-app/products",
      );
      //since our cloudinary utils returns null when failed to upload we need to handle it dynamically
      if (!result) {
        for (const image of newlyUploadedImages) {
          await deleteFromCloudinary(image.public_id);
        }
        throw new ApiError(500, "Failed to upload product images");
      }

      newlyUploadedImages.push({
        public_id: result.public_id,
        url: result.url,
      });
    }
    // Append the new images to whatever images remain after removals.
    product.images = [...product.images, ...newlyUploadedImages];
  }

  await product.save();
  return res
    .status(200)
    .json(new ApiResponse(200, product, "Product updated successfully"));
});

const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }
  for (const image of product.images) {
    await deleteFromCloudinary(image.public_id);
  }
  await Product.findByIdAndDelete(id);
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Product deleted successfully"));
});

export {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};

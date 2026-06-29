import mongoose from "mongoose";
import { Cart } from "../models/cart.model.js";
import { Product } from "../models/product.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const getPopulatedCartForUser = async (userId) => {
  const cart = await Cart.findOne({ user: userId }).populate({
    path: "items.product",
    select: "name price image stock isActive",
  });

  if (!cart) {
    return { items: [], totalItems: 0, totalPrice: 0 };
  }

  // Remove items that no longer exist in the store catalog to prevent crashes
  const validItems = cart.items.filter((item) => item.product !== null);

  let totalItems = 0;
  let totalPrice = 0;

  for (const item of validItems) {
    totalItems += item.quantity;
    totalPrice += item.quantity * item.product.price;
  }

  return {
    _id: cart._id,
    items: validItems,
    totalItems,
    totalPrice,
  };
};

// POST /api/v1/cart  — add an item
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, "Valid productId is required");
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new ApiError(400, "Quantity must be a positive integer");
  }

  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw new ApiError(404, "Product not found");
  }

  if (product.stock < quantity) {
    throw new ApiError(400, `Only ${product.stock} unit(s) in stock`);
  }

  // Look for a cart, make one if missing. The 'unique user' rule stops double-clicks from creating twin carts.
  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    cart = await Cart.create({
      user: req.user._id,
      items: [{ product: productId, quantity }],
    });
  } else {
    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId,
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (product.stock < newQuantity) {
        throw new ApiError(
          400,
          `Only ${product.stock} in stock,you already have ${existingItem.quantity} in your cart`,
        );
      }
      existingItem.quantity = newQuantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }
    await cart.save();
  }

  const populatedCart = await getPopulatedCartForUser(req.user._id);
  return res
    .status(200)
    .json(new ApiResponse(200, populatedCart, "Item added to cart"));
});

// GET /api/v1/cart — view current user's cart
const getCart = asyncHandler(async (req, res) => {
  const cart = await getPopulatedCartForUser(req.user._id);

  return res.status(200).json(new ApiResponse(200, cart, "Cart fetched"));
});

// PATCH /api/v1/cart/:productId — set quantity for a specific item
const updateCartItemQuantity = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, "Invalid productId");
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new ApiError(400, "Quantity must be a positive number");
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    throw new ApiError(404, "Cart is empty");
  }

  const item = cart.items.find((item) => item.product.toString() === productId);
  if (!item) {
    throw new ApiError(404, "Item not found in cart");
  }

  const product = await Product.findById(productId);

  if (!product || !product.isActive) {
    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId,
    );
    await cart.save();

    const populatedCart = await getPopulatedCartForUser(req.user._id);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          populatedCart,
          "Product is no longer available and was removed from your cart",
        ),
      );
  }

  if (product.stock < quantity) {
    throw new ApiError(400, `Only ${product.stock} unit(s) in stock`);
  }
  item.quantity = quantity;
  await cart.save();

  const populatedCart = await getPopulatedCartForUser(req.user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, populatedCart, "Cart item updated"));
});

// DELETE /api/v1/cart/:productId — remove one item
const removeCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, "Invalid productId");
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    throw new ApiError(404, "Cart is empty");
  }

  const itemExists = cart.items.some(
    (item) => item.product.toString() === productId,
  );
  if (!itemExists) {
    throw new ApiError(404, "Item not found in cart");
  }

  cart.items = cart.items.filter(
    (item) => item.product.toString() !== productId,
  );
  await cart.save();

  const populatedCart = await getPopulatedCartForUser(req.user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, populatedCart, "Item removed from cart"));
});

// DELETE /api/v1/cart — clear entire cart
const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    // Nothing to clear — not an error, just a no-op confirmation.
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { items: [], totalItems: 0, totalPrice: 0 },
          "Cart already empty",
        ),
      );
  }

  cart.items = [];
  await cart.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { items: [], totalItems: 0, totalPrice: 0 },
        "Cart cleared",
      ),
    );
});

export {
  addToCart,
  getCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
};

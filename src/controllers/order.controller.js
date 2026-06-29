import mongoose from "mongoose";
import { Order } from "../models/order.model.js";
import { Cart } from "../models/cart.model.js";
import { Product } from "../models/product.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

// Required fields for the embedded shippingAddress sub-schema.
// Validated manually here (in addition to Mongoose's own required validators)
// so we can return one clear 400 instead of a raw Mongoose ValidationError.
const REQUIRED_ADDRESS_FIELDS = [
  "fullName",
  "phone",
  "addressLine1",
  "city",
  "state",
  "postalCode",
  "country",
];

const validateShippingAddress = (shippingAddress) => {
  if (!shippingAddress || typeof shippingAddress !== "object") {
    throw new ApiError(400, "shipping adress is required");
  }
  for (const field of REQUIRED_ADDRESS_FIELDS) {
    if (!shippingAddress[field] || !shippingAddress[field].toString().trim()) {
      throw new ApiError(400, `shippingAddress.${field} is required`);
    }
  }
};

// POST /api/v1/orders — place an order from the current user's cart
const placeOrder = asyncHandler(async (req, res) => {
  const { shippingAddress } = req.body;
  validateShippingAddress(shippingAddress);

  // The 'unique user' rule stops double-clicks from creating twin carts.
  const cart = await Cart.findOne({ user: req.user._id }).populate({
    path: "items.product",
    select: "name price images stock isActive",
  });
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, "Your cart is empty");
  }

  const orderItems = [];
  //Atomicity - all or nothing
  const decrementedStock = []; //{productId,quantity}

  try {
    for (const cartItem of cart.items) {
      const product = cartItem.product;

      if (!product) {
        throw new ApiError(
          400,
          "One of the items in your cart no longer exists",
        );
      }
      if (!product.isActive) {
        throw new ApiError(400, `${product.name} is no longer available`);
      }
      if (product.stock < cartItem.quantity) {
        throw new ApiError(
          400,
          `Only ${product.stock} unit(s) of "${product.name}" left in stock`,
        );
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        image: product.images?.[0].url ?? "",
        quantity: cartItem.quantity,
      });

      // ==========================================
      // REPLACE FROM HERE...
      // ==========================================
      // Try to decrement stock atomically, but ONLY if there is enough left in the DB right now
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: product._id,
          stock: { $gte: cartItem.quantity }, // Race condition guard
        },
        {
          $inc: { stock: -cartItem.quantity },
        },
        { new: true },
      );

      // If no product was updated, it means another user bought it a millisecond ago
      if (!updatedProduct) {
        throw new ApiError(
          400,
          `Item "${product.name}" just ran out of stock! Please update your cart.`,
        );
      }

      decrementedStock.push({
        productId: product._id,
        quantity: cartItem.quantity,
      });
      // ==========================================
      // ...TO HERE
      // ==========================================
    }
  } catch (error) {
    // Robust rollback loop: ensure one bad connection doesn't halt the rest
    for (const { productId, quantity } of decrementedStock) {
      try {
        await Product.findByIdAndUpdate(productId, {
          $inc: { stock: quantity },
        });
      } catch (rollbackError) {
        console.error(
          `CRITICAL: Failed to restock product ${productId}:`,
          rollbackError,
        );
      }
    }
    throw error;
  }

  const itemsTotal = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  let order;
  try {
    order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      itemsTotal,
      paymentMethod: "COD",
    });
  } catch (error) {
    // Order document failed to save even after stock was already decremented —
    // roll back stock here too, since the try/catch above only covers the loop.
    for (const { productId, quantity } of decrementedStock) {
      await Product.findByIdAndUpdate(productId, { $inc: { stock: quantity } });
    }
    throw error;
  }

  // Order placed successfully — clear the cart.
  cart.items = [];
  await cart.save();

  return res
    .status(201)
    .json(new ApiResponse(201, order, "Order placed successfully"));
});

// GET /api/v1/orders/my-orders — paginated list of the current user's orders
const getMyOrders = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit) || 10, 1);
  const skip = (page - 1) * limit;

  const filter = { user: req.user._id };

  const [orders, totalOrders] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        orders,
        pagination: {
          totalOrders,
          totalPages: Math.ceil(totalOrders / limit),
          currentPage: page,
          limit,
        },
      },
      "Orders fetched",
    ),
  );
});

// GET /api/v1/orders/:orderId — fetch a single order
const getOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError(404, "Order not found");
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }
  const isOwner = order.user.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    // Same 404 as "doesn't exist" — don't leak that an order belonging to
    // someone else exists at this id.
    throw new ApiError(404, "Order not found");
  }
  return res.status(200).json(new ApiResponse(200, order, "Order fetched"));
});

// PATCH /api/v1/orders/:orderId/cancel — customer cancels their own order
const cancelOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError(404, "Order not found");
  }

  const order = await Order.findById(orderId);
  if (!order || order.user.toString() !== req.user._id.toString()) {
    throw new ApiError(404, "Order not found");
  }
  if (order.status !== "Confirmed") {
    throw new ApiError(
      400,
      `Order cannot be cancelled once it has been ${order.status.toLowerCase()}`,
    );
  }
  // Restock every item — the order never fulfilled, so the stock
  // reservation made at placeOrder time must be reversed.
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity },
    });
  }

  order.status = "Cancelled";
  order.cancelledAt = new Date();
  await order.save();

  return res.status(200).json(new ApiResponse(200, order, "Order cancelled"));
});

// GET /api/v1/orders — admin: list all orders, paginated, optional status filter
const getAllOrders = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit) || 10, 1);
  const skip = (page - 1) * limit;
  const filter = {};
  if (req.query.status) {
    filter.status = req.query.status;
  }
  const [orders, totalOrders] = await Promise.all([
    Order.find(filter)
      .populate({ path: "user", select: "name email" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        orders,
        pagination: {
          totalOrders,
          totalPages: Math.ceil(totalOrders / limit),
          currentPage: page,
          limit,
        },
      },
      "Orders fetched",
    ),
  );
});

// PATCH /api/v1/orders/:orderId/status — admin: move order forward in its lifecycle
// Strictly sequential: Confirmed -> Shipped -> Delivered. Cancellation is NOT
// handled here — that's the customer-only cancelOrder path.

const ALLOWED_TRANSITIONS = {
  Confirmed: "Shipped",
  Shipped: "Delivered",
};

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status: requestedStatus } = req.body;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError(404, "Order not found");
  }
  if (!requestedStatus) {
    throw new ApiError(400, "status is required");
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const nextAllowedStatus = ALLOWED_TRANSITIONS[order.status];

  // Covers: order already Delivered/Cancelled (no further transitions exist),
  // and any attempt to set a status that isn't the single valid "next" step
  // (no skipping, no going backwards, no setting "Cancelled" via this route).
  if (!nextAllowedStatus || requestedStatus !== nextAllowedStatus) {
    throw new ApiError(
      400,
      `Cannot move order from "${order.status}" to "${requestedStatus}". ` +
        (nextAllowedStatus
          ? `Next valid status is "${nextAllowedStatus}".`
          : `Order is in a final state.`),
    );
  }

  order.status = requestedStatus;
  await order.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, order, `Order status updated to ${requestedStatus}`),
    );
});

export {
  placeOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
};

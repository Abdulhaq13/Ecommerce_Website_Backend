import mongoose from "mongoose";
// Embedded sub-schema for shipping address — validated at the DB level
// since this is captured once at order time and should never be incomplete.

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    addressLine1: {
      type: String,
      required: true,
      trim: true,
    },
    adressLine2: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    postalCode: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false, // it's a single embedded value, not a list — no need for its own _id
  },
);

// It locks in the details so that future changes to the store won't alter the customer's past receipt.
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    image: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        // An empty order should never happen. The controller blocks it first,
        // but this acts as a final backup safety net to guarantee we never save
        // an order with zero items.
        validator: (items) => items.length > 0,
        message: "Order must contain at least one item",
      },
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    itemsTotal: {
      type: Number,
      required: true,
      min: 0, //snapshotted sum of (price * quantity) across all items, computed at creation time
    },
    paymentMethod: {
      type: String,
      enum: ["COD"], // enum on purpose — adding Razorpay later is just appending a value, not a schema rewrite
      default: "COD",
      required: true,
    },
    status: {
      type: String,
      enum: ["Confirmed", "Shipped", "Delivered", "Cancelled"],
      default: "Confirmed",
    },
    cancelledAt: {
      type: Date,
      default: null, // only set when status transitions to Cancelled
    },
  },
  { timestamps: true },
);

export const Order = mongoose.model("Order", orderSchema);

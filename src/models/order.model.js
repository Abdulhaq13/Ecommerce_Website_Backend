import mongoose from "mongoose";
import { shippingAddressSchema } from "./shippingAddress.schema.js";

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
    // Products can be created without images, so an empty string is valid here.
    image: {
      type: String,
      default: "",
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

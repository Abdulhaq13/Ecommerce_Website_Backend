import mongoose from "mongoose";

// Embedded shipping address, validated at the DB level so it's never incomplete.
// Shared by Order (snapshot at order time) and User (saved default address).

export const shippingAddressSchema = new mongoose.Schema(
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
    addressLine2: {
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

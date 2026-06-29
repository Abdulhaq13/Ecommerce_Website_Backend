import { z } from "zod";

const shippingAddressSchema = z.object({
  fullName: z
    .string({ error: "shippingAddress.fullName is required" })
    .trim()
    .min(1, "shippingAddress.fullName is required"),

  phone: z
    .string({ error: "shippingAddress.phone is required" })
    .trim()
    .min(1, "shippingAddress.phone is required"),

  addressLine1: z
    .string({ error: "shippingAddress.addressLine1 is required" })
    .trim()
    .min(1, "shippingAddress.addressLine1 is required"),

  addressLine2: z.string().trim().optional(),

  city: z
    .string({ error: "shippingAddress.city is required" })
    .trim()
    .min(1, "shippingAddress.city is required"),

  state: z
    .string({ error: "shippingAddress.state is required" })
    .trim()
    .min(1, "shippingAddress.state is required"),

  postalCode: z
    .string({ error: "shippingAddress.postalCode is required" })
    .trim()
    .min(1, "shippingAddress.postalCode is required"),

  country: z
    .string({ error: "shippingAddress.country is required" })
    .trim()
    .min(1, "shippingAddress.country is required"),
});

export const placeOrderSchema = z.object({
  shippingAddress: shippingAddressSchema,
});

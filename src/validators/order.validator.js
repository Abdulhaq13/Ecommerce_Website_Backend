import { z } from "zod";

const shippingAddressSchema = z.object({
  fullName: z
    .string({ error: "fullName is required" })
    .trim()
    .min(1, "fullName is required"),

  phone: z
    .string({ error: "phone is required" })
    .trim()
    .min(1, "phone is required"),

  addressLine1: z
    .string({ error: ".addressLine1 is required" })
    .trim()
    .min(1, "addressLine1 is required"),

  addressLine2: z.string().trim().optional(),

  city: z
    .string({ error: "city is required" })
    .trim()
    .min(1, "city is required"),

  state: z
    .string({ error: "state is required" })
    .trim()
    .min(1, "state is required"),

  postalCode: z
    .string({ error: "postalCode is required" })
    .trim()
    .min(1, "postalCode is required"),

  country: z
    .string({ error: "country is required" })
    .trim()
    .min(1, "country is required"),
});

export const placeOrderSchema = z.object({
  shippingAddress: shippingAddressSchema,
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["Confirmed", "Shipped", "Delivered", "Cancelled"], {
    error: "status must be one of: Confirmed, Shipped, Delivered, Cancelled",
  }),
});

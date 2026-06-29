import { z } from "zod";

// shared quantity rule — used identically in addToCart and updateCartItemQuantity
const quantityField = z
  .number({ error: "Quantity is required" })
  .int("Quantity must be a whole number")
  .min(1, "Quantity must be at least 1");

export const addToCartSchema = z.object({
  productId: z
    .string({ error: "Product ID is required" })
    .trim()
    .min(1, "Product ID is required"),

  quantity: quantityField.optional().default(1),
});

export const updateCartItemQuantitySchema = z.object({
  quantity: quantityField,
});

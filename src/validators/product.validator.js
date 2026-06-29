import { z } from "zod";

// price/stock arrive as strings from multipart/form-data — coerce to real numbers
// so the controller gets clean types instead of relying on JS loose comparison
const priceField = z.coerce
  .number({ error: "Price is required" })
  .min(0, "Price cannot be negative");

const stockField = z.coerce
  .number({ error: "Stock is required" })
  .int("Stock must be a whole number")
  .min(0, "Stock cannot be negative");

// multipart sends "true"/"false" as literal strings, which are truthy in JS —
// explicitly map them to real booleans instead of trusting Boolean(value)
const isActiveField = z.preprocess(
  (val) => {
    if (val === "true") return true;
    if (val === "false") return false;
    return val;
  },
  z.boolean({ error: "isActive must be true or false" }),
);

export const createProductSchema = z.object({
  name: z
    .string({ error: "Product name is required" })
    .trim()
    .min(2, "Product name must be at least 2 characters")
    .max(100, "Product name must be under 100 characters"),

  description: z
    .string({ error: "Product description is required" })
    .trim()
    .min(10, "Description must be at least 10 characters"),

  price: priceField,

  category: z
    .string({ error: "Category is required" })
    .trim()
    .min(1, "Category is required"),

  stock: stockField,
});

export const updateProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Product name must be at least 2 characters")
    .max(100, "Product name must be under 100 characters")
    .optional(),

  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .optional(),

  price: priceField.optional(),

  category: z.string().trim().min(1, "Category is required").optional(),

  stock: stockField.optional(),

  isActive: isActiveField.optional(),

  // accepts a single public_id string OR an array of them, always normalizes to array
  removeImagePublicIds: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .optional(),
});

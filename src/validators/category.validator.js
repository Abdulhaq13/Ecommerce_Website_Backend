import { z } from "zod";

export const createCategorySchema = z.object({
  name: z
    .string({ error: "Category name is required" })
    .trim()
    .min(2, "Category name must be at least 2 characters")
    .max(50, "Category name must be under 50 characters"),
});

// Both fields optional so an admin can rename, toggle isActive, or both —
// but an empty body is rejected.
export const updateCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Category name must be at least 2 characters")
      .max(50, "Category name must be under 50 characters")
      .optional(),
    isActive: z.boolean({ error: "isActive must be true or false" }).optional(),
  })
  .refine((data) => data.name !== undefined || data.isActive !== undefined, {
    error: "Provide name or isActive to update",
  });

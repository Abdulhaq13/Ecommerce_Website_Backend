import { z } from "zod";

export const createCategorySchema = z.object({
  name: z
    .string({ error: "Category name is required" })
    .trim()
    .min(2, "Category name must be at least 2 characters")
    .max(50, "Category name must be under 50 characters"),
});

export const updateCategorySchema = z.object({
  name: z
    .string({ error: "Category name is required" })
    .trim()
    .min(2, "Category name must be at least 2 characters")
    .max(50, "Category name must be under 50 characters"),
});

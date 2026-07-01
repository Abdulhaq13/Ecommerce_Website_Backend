import { z } from "zod";

const emailField = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase() // normalize case so "User@x.com" and "user@x.com" aren't treated as different accounts
  .email("Invalid email address");

const newPasswordField = z
  .string({ error: "Password is required" })
  .min(8, "Password must be at least 8 characters");

export const registerSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be under 50 characters"),

  email: emailField,

  password: newPasswordField,
});

export const loginSchema = z.object({
  email: emailField,
  password: z
    .string({ error: "Password is required" })
    .min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z.object({
  password: newPasswordField,
});

export const changePasswordSchema = z.object({
  oldPassword: z
    .string({ error: "Current password is required" })
    .min(1, "Current password is required"),
  newPassword: newPasswordField,
});

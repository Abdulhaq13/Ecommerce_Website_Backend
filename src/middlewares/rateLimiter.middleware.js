import { rateLimit, ipKeyGenerator } from "express-rate-limit";

// Combines IP + email safely into one key by using the library's internal helper.
// This fixes the IPv6 validation crash while keeping your exact strategy.
const ipAndEmailKey = (req) =>
  `${ipKeyGenerator(req)}-${req.body?.email ?? "no-email"}`;

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  keyGenerator: ipAndEmailKey,
  message: {
    success: false,
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }, // Disables strict proxy checking crash
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message:
      "Too many registration attempts from this IP. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  keyGenerator: ipAndEmailKey,
  message: {
    success: false,
    message:
      "Too many password reset requests. Please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

export const refreshTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many refresh attempts. Please try again shortly.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

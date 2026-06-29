import { rateLimit } from "express-rate-limit";

// Combines IP + email into one key, so a single IP can't get blanket-blocked
// for OTHER users' login attempts, but repeated attempts at one email
// (even from different IPs) still get throttled.
const ipAndEmailKey = (req) => `${req.ip}-${req.body?.email ?? "no-email"}`;

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  keyGenerator: ipAndEmailKey,
  message: {
    success: false,
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
  standardHeaders: true, // sends RateLimit-* headers so clients can see remaining attempts
  legacyHeaders: false,
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  // no keyGenerator override — defaults to IP only, which is what we want here
  message: {
    success: false,
    message:
      "Too many registration attempts from this IP. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
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
});

export const refreshTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  // IP only — refreshAccessToken has no email in its body, just a cookie
  message: {
    success: false,
    message: "Too many refresh attempts. Please try again shortly.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

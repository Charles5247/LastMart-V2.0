/**
 * ─── Rate Limiting Middleware ────────────────────────────────────────────────
 * Protects auth endpoints from brute force attacks and abuse.
 * Uses express-rate-limit with in-memory store (suitable for single-server deployments).
 * For distributed systems, consider Redis store.
 * ────────────────────────────────────────────────────────────────────────────
 */
import rateLimit from "express-rate-limit";

const getClientIp = (req: any): string => {
  const forwarded = req.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.ip || "unknown";
};

/**
 * Login attempt limiter: 50 attempts per 15 minutes per IP
 * Helps prevent brute force password guessing attacks.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    error: "Too many login attempts. Please try again in 15 minutes.",
    retryAfter: 15,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: getClientIp,
});

/**
 * Register attempt limiter: 10 attempts per 60 minutes per IP
 * Prevents rapid account creation spam and abuse.
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: "Too many registration attempts. Please try again in 1 hour.",
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
});

/**
 * Password reset limiter: 10 attempts per 60 minutes per IP
 * Prevents password reset spam and account enumeration abuse.
 */
export const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: "Too many password reset attempts. Please try again in 1 hour.",
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
});

/**
 * Verify code limiter: 20 attempts per 10 minutes per IP
 * Prevents brute force attacks on verification codes.
 */
export const verifyCodeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: "Too many verification attempts. Please try again later.",
    retryAfter: 10,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
});

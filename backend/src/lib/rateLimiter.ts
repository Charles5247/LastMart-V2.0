/**
 * ─── Rate Limiting Middleware ────────────────────────────────────────────────
 * Protects auth endpoints from brute force attacks and abuse.
 * Uses express-rate-limit with in-memory store (suitable for single-server deployments).
 * For distributed systems, consider Redis store.
 * ────────────────────────────────────────────────────────────────────────────
 */

import rateLimit from 'express-rate-limit';

/**
 * Login attempt limiter: 5 attempts per 15 minutes per IP
 * Helps prevent brute force password guessing attacks.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: 'Too many login attempts. Please try again in 15 minutes.',
    retryAfter: 15,
  },
  standardHeaders: true, // return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting if X-Forwarded-For header is present (trusted proxy)
    // This allows load balancers to bypass the limiter on health checks
    return false;
  },
  keyGenerator: (req) => {
    // Use X-Forwarded-For if behind a proxy, otherwise use IP
    return req.get('x-forwarded-for')?.split(',')[0].trim() || req.ip || 'unknown';
  },
});

/**
 * Register attempt limiter: 3 attempts per 60 minutes per IP
 * Prevents rapid account creation spam and abuse.
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 registrations per hour
  message: {
    success: false,
    error: 'Too many registration attempts. Please try again in 1 hour.',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.get('x-forwarded-for')?.split(',')[0].trim() || req.ip || 'unknown';
  },
});

/**
 * Password reset limiter: 3 attempts per 60 minutes per IP
 * Prevents password reset spam and account enumeration abuse.
 */
export const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset attempts per hour
  message: {
    success: false,
    error: 'Too many password reset attempts. Please try again in 1 hour.',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.get('x-forwarded-for')?.split(',')[0].trim() || req.ip || 'unknown';
  },
});

/**
 * Verify code limiter: 10 attempts per 10 minutes per IP
 * Prevents brute force attacks on verification codes.
 */
export const verifyCodeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // limit each IP to 10 attempts per 10 minutes
  message: {
    success: false,
    error: 'Too many verification attempts. Please try again later.',
    retryAfter: 10,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.get('x-forwarded-for')?.split(',')[0].trim() || req.ip || 'unknown';
  },
});

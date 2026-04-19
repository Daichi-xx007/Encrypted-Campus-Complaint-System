// ============================================================
// Rate Limiter Middleware
// ============================================================
// Prevents brute-force attacks and DoS by limiting request
// rates per IP and per endpoint category.
// ============================================================

const rateLimit = require('express-rate-limit');
const { RATE_LIMIT } = require('../config/security');

/**
 * Login rate limiter — 5 attempts per 15 minutes per IP.
 */
const loginLimiter = rateLimit({
  windowMs: RATE_LIMIT.LOGIN.windowMs,
  max: RATE_LIMIT.LOGIN.max,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
});

/**
 * General API rate limiter — 100 requests per minute.
 */
const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT.API.windowMs,
  max: RATE_LIMIT.API.max,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Complaint submission rate limiter — 10 per hour.
 */
const complaintLimiter = rateLimit({
  windowMs: RATE_LIMIT.COMPLAINT.windowMs,
  max: RATE_LIMIT.COMPLAINT.max,
  message: { error: 'Too many complaints submitted. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter, apiLimiter, complaintLimiter };

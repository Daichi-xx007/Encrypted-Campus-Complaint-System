// ============================================================
// Input Validation Middleware
// ============================================================
// Express-validator based validation chains for all inputs.
// Prevents SQL injection, XSS, and other injection attacks
// through strict whitelist validation.
// ============================================================

const { body, param, query, validationResult } = require('express-validator');
const {
  COMPLAINT_CATEGORIES,
  COMPLAINT_PRIORITIES,
  PASSWORD_MIN_LENGTH,
  ROLES,
} = require('../config/security');

/**
 * Handle validation errors — returns 400 with detailed messages.
 */
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

/**
 * Sanitize string: trim and escape HTML entities.
 */
function sanitizeString(value) {
  if (typeof value !== 'string') return value;
  return value
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ---- Validation chains ----

const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores')
    .customSanitizer(sanitizeString),
  body('email')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: PASSWORD_MIN_LENGTH }).withMessage(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain a special character'),
  body('full_name')
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be 2-100 characters')
    .customSanitizer(sanitizeString),
  body('department')
    .optional()
    .isLength({ max: 100 }).withMessage('Department must be under 100 characters')
    .customSanitizer(sanitizeString),
  handleValidation,
];

const loginValidation = [
  body('username')
    .notEmpty().withMessage('Username is required')
    .customSanitizer(sanitizeString),
  body('password')
    .notEmpty().withMessage('Password is required'),
  handleValidation,
];

const complaintValidation = [
  body('title')
    .isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters')
    .customSanitizer(sanitizeString),
  body('description')
    .isLength({ min: 10, max: 5000 }).withMessage('Description must be 10-5000 characters')
    .customSanitizer(sanitizeString),
  body('category')
    .isIn(COMPLAINT_CATEGORIES).withMessage('Invalid complaint category'),
  body('priority')
    .optional()
    .isIn(COMPLAINT_PRIORITIES).withMessage('Invalid priority level'),
  body('is_anonymous')
    .optional()
    .isBoolean().withMessage('is_anonymous must be a boolean'),
  handleValidation,
];

const complaintUpdateValidation = [
  body('content')
    .isLength({ min: 1, max: 5000 }).withMessage('Content must be 1-5000 characters')
    .customSanitizer(sanitizeString),
  body('status')
    .optional()
    .isIn(['submitted', 'assigned', 'in_progress', 'resolved', 'closed']).withMessage('Invalid status'),
  handleValidation,
];

const userRoleValidation = [
  body('role')
    .isIn([ROLES.STUDENT, ROLES.STAFF, ROLES.ADMIN]).withMessage('Invalid role'),
  handleValidation,
];

const idParamValidation = [
  param('id')
    .isInt({ min: 1 }).withMessage('Invalid ID parameter'),
  handleValidation,
];

module.exports = {
  registerValidation,
  loginValidation,
  complaintValidation,
  complaintUpdateValidation,
  userRoleValidation,
  idParamValidation,
  handleValidation,
  sanitizeString,
};

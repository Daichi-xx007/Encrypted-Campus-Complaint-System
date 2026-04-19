// ============================================================
// Security Configuration — Encrypted Smart Complaint System
// ============================================================
// Centralizes all security constants and settings.
// Values can be overridden via environment variables.
// ============================================================

const crypto = require('crypto');

module.exports = {
  // --- Bcrypt ---
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),

  // --- AES-256-GCM Encryption ---
  ENCRYPTION_ALGORITHM: 'aes-256-gcm',
  // Key must be 32 bytes (256 bits). Loaded from env, fallback for dev only.
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY
    || crypto.createHash('sha256').update('dev-only-change-in-production-32!').digest(),
  IV_LENGTH: 16,       // 128-bit IV for GCM
  AUTH_TAG_LENGTH: 16,  // 128-bit authentication tag

  // --- Session ---
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev-session-secret-change-me-in-prod',
  SESSION_MAX_AGE: 30 * 60 * 1000,   // 30 minutes
  SESSION_NAME: 'escms.sid',

  // --- CSRF ---
  CSRF_SECRET: process.env.CSRF_SECRET || 'dev-csrf-secret-change-me',
  CSRF_COOKIE_NAME: 'escms.csrf',

  // --- Rate Limiting ---
  RATE_LIMIT: {
    LOGIN: { windowMs: 15 * 60 * 1000, max: 5 },     // 5 per 15 min
    API: { windowMs: 60 * 1000, max: 100 },            // 100 per min
    COMPLAINT: { windowMs: 60 * 60 * 1000, max: 10 },  // 10 per hour
  },

  // --- File Upload ---
  FILE_UPLOAD: {
    MAX_SIZE: 5 * 1024 * 1024,  // 5 MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.pdf'],
  },

  // --- Password Policy ---
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIRE_UPPERCASE: true,
  PASSWORD_REQUIRE_LOWERCASE: true,
  PASSWORD_REQUIRE_NUMBER: true,
  PASSWORD_REQUIRE_SPECIAL: true,

  // --- Roles ---
  ROLES: {
    STUDENT: 'student',
    STAFF: 'staff',
    ADMIN: 'admin',
  },

  // --- Complaint ---
  COMPLAINT_STATUSES: ['submitted', 'assigned', 'in_progress', 'resolved', 'closed'],
  COMPLAINT_CATEGORIES: [
    'Harassment',
    'Academic Misconduct',
    'Facility Issue',
    'Administrative',
    'Discrimination',
    'Safety Concern',
    'IT / Technical',
    'Other',
  ],
  COMPLAINT_PRIORITIES: ['low', 'medium', 'high', 'critical'],

  // --- Content Security Policy ---
  CSP_DIRECTIVES: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:', 'blob:'],
    connectSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    baseUri: ["'self'"],
  },
};

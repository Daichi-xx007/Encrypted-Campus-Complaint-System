// ============================================================
// CSRF Protection Middleware
// ============================================================
// Double-submit cookie pattern for CSRF protection.
// Token generated server-side, sent as cookie + validated
// from request header on state-changing operations.
// ============================================================

const crypto = require('crypto');

const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = 'escms-csrf';
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Generate a cryptographically random CSRF token.
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * CSRF middleware — sets token cookie on GET, validates on mutations.
 */
function csrfProtection(req, res, next) {
  // For safe methods, ensure a CSRF token cookie exists
  if (SAFE_METHODS.includes(req.method)) {
    if (!req.cookies || !req.cookies[CSRF_COOKIE]) {
      const token = generateToken();
      res.cookie(CSRF_COOKIE, token, {
        httpOnly: false,    // Client JS must read this to send in header
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      });
      // Also store in session for validation
      if (req.session) {
        req.session.csrfToken = token;
      }
    }
    return next();
  }

  // For state-changing methods, validate CSRF token
  const headerToken = req.headers[CSRF_HEADER];
  const cookieToken = req.cookies ? req.cookies[CSRF_COOKIE] : null;

  if (!headerToken || !cookieToken) {
    return res.status(403).json({ error: 'CSRF token missing.' });
  }

  // Double-submit validation: header must match cookie
  if (headerToken !== cookieToken) {
    return res.status(403).json({ error: 'CSRF token validation failed.' });
  }

  next();
}

/**
 * Endpoint to get CSRF token (for SPA initial load).
 */
function csrfTokenEndpoint(req, res) {
  let token = req.cookies ? req.cookies[CSRF_COOKIE] : null;
  if (!token) {
    token = generateToken();
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }
  res.json({ csrfToken: token });
}

module.exports = { csrfProtection, csrfTokenEndpoint };

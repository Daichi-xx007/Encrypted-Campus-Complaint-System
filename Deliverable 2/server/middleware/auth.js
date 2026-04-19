// ============================================================
// Authentication Middleware
// ============================================================
// Session-based authentication check.
// Blocks unauthenticated access to protected endpoints.
// ============================================================

/**
 * Require an authenticated session.
 * Returns 401 if no valid session exists.
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  next();
}

/**
 * Require one of the specified roles.
 * Must be used AFTER requireAuth.
 * @param  {...string} roles - Allowed roles
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.role) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.session.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient privileges.' });
    }
    next();
  };
}

/**
 * Optionally attach user info from session (for routes that work
 * both authenticated and unauthenticated).
 */
function optionalAuth(req, res, next) {
  // Session data is always available if it exists; just continue
  next();
}

module.exports = { requireAuth, requireRole, optionalAuth };

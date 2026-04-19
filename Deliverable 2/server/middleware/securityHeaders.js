// ============================================================
// Security Headers Middleware
// ============================================================
// Uses Helmet to set comprehensive security headers including
// Content Security Policy, HSTS, X-Frame-Options, etc.
// ============================================================

const helmet = require('helmet');
const { CSP_DIRECTIVES } = require('../config/security');

/**
 * Configure and return Helmet middleware with strict CSP.
 */
function securityHeaders() {
  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: CSP_DIRECTIVES,
    },
    // Strict-Transport-Security (HSTS)
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    // Prevent clickjacking
    frameguard: { action: 'deny' },
    // Prevent MIME-type sniffing
    noSniff: true,
    // Referrer policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // Hide X-Powered-By
    hidePoweredBy: true,
    // XSS filter (legacy browsers)
    xssFilter: true,
  });
}

module.exports = { securityHeaders };

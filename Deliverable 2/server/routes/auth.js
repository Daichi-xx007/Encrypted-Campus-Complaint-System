// ============================================================
// Authentication Routes
// ============================================================
// Handles user registration, login, logout, and session info.
// Implements bcrypt hashing, account lockout, and audit logging.
// ============================================================

const express = require('express');
const bcrypt = require('bcryptjs');
const { BCRYPT_SALT_ROUNDS, ROLES } = require('../config/security');
const { loginLimiter } = require('../middleware/rateLimiter');
const { registerValidation, loginValidation } = require('../middleware/inputValidator');
const { requireAuth } = require('../middleware/auth');
const auditLog = require('../services/auditLog');
const { csrfTokenEndpoint } = require('../middleware/csrf');

function createAuthRouter(dbHelper) {
  const router = express.Router();

  // ---- GET CSRF Token ----
  router.get('/csrf-token', csrfTokenEndpoint);

  // ---- REGISTER ----
  router.post('/register', registerValidation, (req, res) => {
    try {
      const { username, email, password, full_name, department } = req.body;

      // Check if username or email already exists (parameterized query)
      const existingUser = dbHelper.prepare(
        'SELECT id FROM users WHERE username = ? OR email = ?'
      ).get(username, email);

      if (existingUser) {
        return res.status(409).json({ error: 'Username or email already registered.' });
      }

      // Hash password with bcrypt (salt rounds = 12)
      const passwordHash = bcrypt.hashSync(password, BCRYPT_SALT_ROUNDS);

      const result = dbHelper.prepare(`
        INSERT INTO users (username, email, password_hash, full_name, role, department)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(username, email, passwordHash, full_name, ROLES.STUDENT, department || '');

      // Audit log
      auditLog.log({
        userId: result.lastInsertRowid,
        action: auditLog.ACTIONS.REGISTER,
        resource: 'auth',
        resourceId: String(result.lastInsertRowid),
        details: `New user registered: ${username}`,
        ipAddress: req.ip,
      });

      res.status(201).json({
        message: 'Registration successful. Please log in.',
        userId: result.lastInsertRowid,
      });
    } catch (err) {
      console.error('[AUTH] Register error:', err.message);
      res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
  });

  // ---- LOGIN ----
  router.post('/login', loginLimiter, loginValidation, (req, res) => {
    try {
      const { username, password } = req.body;

      const user = dbHelper.prepare(
        'SELECT * FROM users WHERE username = ?'
      ).get(username);

      if (!user) {
        auditLog.log({
          action: auditLog.ACTIONS.LOGIN_FAILED,
          resource: 'auth',
          details: `Failed login attempt for unknown user: ${username}`,
          ipAddress: req.ip,
        });
        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      // Check if account is locked
      if (user.locked_until) {
        const lockExpiry = new Date(user.locked_until);
        if (lockExpiry > new Date()) {
          return res.status(423).json({
            error: 'Account is temporarily locked. Please try again later.',
            locked_until: user.locked_until,
          });
        }
        dbHelper.prepare('UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);
      }

      // Check if account is active
      if (!user.is_active) {
        return res.status(403).json({ error: 'Account is deactivated. Contact administrator.' });
      }

      // Verify password
      const passwordMatch = bcrypt.compareSync(password, user.password_hash);
      if (!passwordMatch) {
        const attempts = (user.login_attempts || 0) + 1;
        let lockedUntil = null;

        if (attempts >= 5) {
          lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        }

        dbHelper.prepare(
          'UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?'
        ).run(attempts, lockedUntil, user.id);

        auditLog.log({
          userId: user.id,
          action: auditLog.ACTIONS.LOGIN_FAILED,
          resource: 'auth',
          resourceId: String(user.id),
          details: `Failed login attempt (${attempts}/5)${lockedUntil ? ' — account locked' : ''}`,
          ipAddress: req.ip,
        });

        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      // Successful login — reset attempts, create session
      dbHelper.prepare(
        'UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = ?'
      ).run(user.id);

      // Regenerate session to prevent session fixation
      req.session.regenerate((err) => {
        if (err) {
          console.error('[AUTH] Session regeneration error:', err);
          return res.status(500).json({ error: 'Login failed. Please try again.' });
        }

        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;
        req.session.fullName = user.full_name;

        auditLog.log({
          userId: user.id,
          action: auditLog.ACTIONS.LOGIN_SUCCESS,
          resource: 'auth',
          resourceId: String(user.id),
          details: `User logged in: ${user.username} (${user.role})`,
          ipAddress: req.ip,
        });

        res.json({
          message: 'Login successful.',
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            department: user.department,
          },
        });
      });
    } catch (err) {
      console.error('[AUTH] Login error:', err.message);
      res.status(500).json({ error: 'Login failed. Please try again.' });
    }
  });

  // ---- LOGOUT ----
  router.post('/logout', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const username = req.session.username;

    auditLog.log({
      userId,
      action: auditLog.ACTIONS.LOGOUT,
      resource: 'auth',
      resourceId: String(userId),
      details: `User logged out: ${username}`,
      ipAddress: req.ip,
    });

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed.' });
      }
      res.clearCookie('escms.sid');
      res.json({ message: 'Logged out successfully.' });
    });
  });

  // ---- GET CURRENT USER ----
  router.get('/me', requireAuth, (req, res) => {
    const user = dbHelper.prepare(
      'SELECT id, username, email, full_name, role, department, created_at FROM users WHERE id = ?'
    ).get(req.session.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user });
  });

  return router;
}

module.exports = createAuthRouter;

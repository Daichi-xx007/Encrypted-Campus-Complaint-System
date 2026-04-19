// ============================================================
// Admin Routes
// ============================================================
// User management, audit log viewing, report generation.
// All endpoints restricted to admin role only.
// ============================================================

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { userRoleValidation, idParamValidation } = require('../middleware/inputValidator');
const auditLog = require('../services/auditLog');
const { ROLES } = require('../config/security');

function createAdminRouter(dbHelper) {
  const router = express.Router();

  router.use(requireAuth, requireRole(ROLES.ADMIN));

  // ====== LIST ALL USERS ======
  router.get('/users', (req, res) => {
    try {
      const users = dbHelper.prepare(
        'SELECT id, username, email, full_name, role, department, is_active, login_attempts, locked_until, created_at, updated_at FROM users ORDER BY created_at DESC'
      ).all();
      res.json({ users });
    } catch (err) {
      console.error('[ADMIN] List users error:', err.message);
      res.status(500).json({ error: 'Failed to retrieve users.' });
    }
  });

  // ====== CHANGE USER ROLE ======
  router.put('/users/:id/role', idParamValidation, userRoleValidation, (req, res) => {
    try {
      const { role } = req.body;
      const targetUserId = parseInt(req.params.id);

      if (targetUserId === req.session.userId) {
        return res.status(400).json({ error: 'Cannot change your own role.' });
      }

      const user = dbHelper.prepare('SELECT id, username, role FROM users WHERE id = ?').get(targetUserId);
      if (!user) return res.status(404).json({ error: 'User not found.' });

      dbHelper.prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?").run(role, targetUserId);

      auditLog.log({
        userId: req.session.userId,
        action: auditLog.ACTIONS.USER_ROLE_CHANGED,
        resource: 'user',
        resourceId: String(targetUserId),
        details: `Role changed from ${user.role} to ${role} for user: ${user.username}`,
        ipAddress: req.ip,
      });

      res.json({ message: `User role updated to: ${role}` });
    } catch (err) {
      console.error('[ADMIN] Change role error:', err.message);
      res.status(500).json({ error: 'Failed to change user role.' });
    }
  });

  // ====== ACTIVATE / DEACTIVATE USER ======
  router.put('/users/:id/status', idParamValidation, (req, res) => {
    try {
      const { is_active } = req.body;
      const targetUserId = parseInt(req.params.id);

      if (targetUserId === req.session.userId) {
        return res.status(400).json({ error: 'Cannot deactivate your own account.' });
      }

      const user = dbHelper.prepare('SELECT id, username FROM users WHERE id = ?').get(targetUserId);
      if (!user) return res.status(404).json({ error: 'User not found.' });

      dbHelper.prepare("UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?").run(is_active ? 1 : 0, targetUserId);

      auditLog.log({
        userId: req.session.userId,
        action: auditLog.ACTIONS.USER_STATUS_CHANGED,
        resource: 'user',
        resourceId: String(targetUserId),
        details: `User ${user.username} ${is_active ? 'activated' : 'deactivated'}`,
        ipAddress: req.ip,
      });

      res.json({ message: `User ${is_active ? 'activated' : 'deactivated'} successfully.` });
    } catch (err) {
      console.error('[ADMIN] Status change error:', err.message);
      res.status(500).json({ error: 'Failed to update user status.' });
    }
  });

  // ====== UNLOCK USER ACCOUNT ======
  router.put('/users/:id/unlock', idParamValidation, (req, res) => {
    try {
      const targetUserId = parseInt(req.params.id);

      const user = dbHelper.prepare('SELECT id, username, login_attempts, locked_until FROM users WHERE id = ?').get(targetUserId);
      if (!user) return res.status(404).json({ error: 'User not found.' });

      dbHelper.prepare(
        "UPDATE users SET login_attempts = 0, locked_until = NULL, updated_at = datetime('now') WHERE id = ?"
      ).run(targetUserId);

      auditLog.log({
        userId: req.session.userId,
        action: auditLog.ACTIONS.USER_STATUS_CHANGED,
        resource: 'user',
        resourceId: String(targetUserId),
        details: `Account unlocked for user: ${user.username} (was ${user.login_attempts} attempts)`,
        ipAddress: req.ip,
      });

      res.json({ message: `Account unlocked successfully for ${user.username}.` });
    } catch (err) {
      console.error('[ADMIN] Unlock error:', err.message);
      res.status(500).json({ error: 'Failed to unlock account.' });
    }
  });

  // ====== AUDIT LOGS ======
  router.get('/audit-logs', (req, res) => {
    try {
      const { action, user_id, page = 1, limit = 50 } = req.query;
      const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

      let sql = `SELECT al.*, u.username, u.full_name
                 FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id WHERE 1=1`;
      let countSql = 'SELECT COUNT(*) as total FROM audit_logs al WHERE 1=1';
      const params = [];
      const countParams = [];

      if (action) {
        sql += ' AND al.action = ?';
        countSql += ' AND al.action = ?';
        params.push(action);
        countParams.push(action);
      }
      if (user_id) {
        sql += ' AND al.user_id = ?';
        countSql += ' AND al.user_id = ?';
        params.push(parseInt(user_id));
        countParams.push(parseInt(user_id));
      }

      const countRow = dbHelper.prepare(countSql).get(...countParams);

      sql += ' ORDER BY al.id DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      const logs = dbHelper.prepare(sql).all(...params);

      auditLog.log({
        userId: req.session.userId,
        action: auditLog.ACTIONS.AUDIT_LOG_VIEWED,
        resource: 'audit_log',
        details: `Audit logs viewed (page ${page})`,
        ipAddress: req.ip,
      });

      res.json({
        logs,
        pagination: {
          total: countRow ? countRow.total : 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil((countRow ? countRow.total : 0) / parseInt(limit)),
        },
      });
    } catch (err) {
      console.error('[ADMIN] Audit logs error:', err.message);
      res.status(500).json({ error: 'Failed to retrieve audit logs.' });
    }
  });

  // ====== VERIFY AUDIT LOG INTEGRITY ======
  router.get('/audit-logs/verify', (req, res) => {
    try {
      const result = auditLog.verifyChain();
      res.json(result);
    } catch (err) {
      console.error('[ADMIN] Audit verify error:', err.message);
      res.status(500).json({ error: 'Failed to verify audit log integrity.' });
    }
  });

  // ====== REPORTS / STATISTICS ======
  router.get('/reports', (req, res) => {
    try {
      const totalComplaints = dbHelper.prepare('SELECT COUNT(*) as count FROM complaints').get();
      const byStatus = dbHelper.prepare('SELECT status, COUNT(*) as count FROM complaints GROUP BY status').all();
      const byCategory = dbHelper.prepare('SELECT category, COUNT(*) as count FROM complaints GROUP BY category').all();
      const byPriority = dbHelper.prepare('SELECT priority, COUNT(*) as count FROM complaints GROUP BY priority').all();
      const totalUsers = dbHelper.prepare('SELECT COUNT(*) as count FROM users').get();
      const usersByRole = dbHelper.prepare('SELECT role, COUNT(*) as count FROM users GROUP BY role').all();
      const recentComplaints = dbHelper.prepare("SELECT COUNT(*) as count FROM complaints WHERE created_at >= datetime('now', '-30 days')").get();
      const resolvedComplaints = dbHelper.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'resolved' OR status = 'closed'").get();
      const avgResTime = dbHelper.prepare("SELECT AVG(julianday(resolved_at) - julianday(created_at)) as avg_days FROM complaints WHERE resolved_at IS NOT NULL").get();

      auditLog.log({
        userId: req.session.userId,
        action: auditLog.ACTIONS.REPORT_GENERATED,
        resource: 'report',
        details: 'System report generated',
        ipAddress: req.ip,
      });

      const tc = totalComplaints ? totalComplaints.count : 0;
      const rc = resolvedComplaints ? resolvedComplaints.count : 0;

      res.json({
        summary: {
          totalComplaints: tc,
          resolvedComplaints: rc,
          resolutionRate: tc > 0 ? ((rc / tc) * 100).toFixed(1) : 0,
          avgResolutionDays: avgResTime && avgResTime.avg_days ? avgResTime.avg_days.toFixed(1) : 'N/A',
          recentComplaints: recentComplaints ? recentComplaints.count : 0,
          totalUsers: totalUsers ? totalUsers.count : 0,
        },
        byStatus,
        byCategory,
        byPriority,
        usersByRole,
      });
    } catch (err) {
      console.error('[ADMIN] Reports error:', err.message);
      res.status(500).json({ error: 'Failed to generate reports.' });
    }
  });

  // ====== GET STAFF LIST ======
  router.get('/staff', (req, res) => {
    try {
      const staff = dbHelper.prepare(
        'SELECT id, username, full_name, department, is_active FROM users WHERE role = ? AND is_active = 1 ORDER BY full_name'
      ).all(ROLES.STAFF);
      res.json({ staff });
    } catch (err) {
      console.error('[ADMIN] Staff list error:', err.message);
      res.status(500).json({ error: 'Failed to retrieve staff list.' });
    }
  });

  return router;
}

module.exports = createAdminRouter;

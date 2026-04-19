// ============================================================
// Complaint Routes
// ============================================================
// Full complaint lifecycle: submit, list, view, update, assign.
// All complaint content is AES-256-GCM encrypted at rest.
// ============================================================

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { complaintAccess } = require('../middleware/rbac');
const { complaintLimiter } = require('../middleware/rateLimiter');
const { complaintValidation, complaintUpdateValidation, idParamValidation } = require('../middleware/inputValidator');
const { encrypt, decrypt, decryptFields } = require('../services/encryption');
const auditLog = require('../services/auditLog');
const notification = require('../services/notification');
const { ROLES, COMPLAINT_CATEGORIES, COMPLAINT_PRIORITIES } = require('../config/security');

function createComplaintRouter(dbHelper) {
  const router = express.Router();

  // ====== GET CATEGORIES & PRIORITIES (must be before /:id) ======
  router.get('/meta/options', requireAuth, (req, res) => {
    res.json({
      categories: COMPLAINT_CATEGORIES,
      priorities: COMPLAINT_PRIORITIES,
    });
  });

  // ====== SUBMIT COMPLAINT ======
  router.post('/', requireAuth, requireRole(ROLES.STUDENT, ROLES.ADMIN), complaintLimiter, complaintValidation, (req, res) => {
    try {
      const { title, description, category, priority, is_anonymous } = req.body;
      const userId = req.session.userId;

      const titleEnc = encrypt(title);
      const descriptionEnc = encrypt(description);

      const result = dbHelper.prepare(`
        INSERT INTO complaints (user_id, is_anonymous, category, priority, title_enc, description_enc, status)
        VALUES (?, ?, ?, ?, ?, ?, 'submitted')
      `).run(
        is_anonymous ? null : userId,
        is_anonymous ? 1 : 0,
        category,
        priority || 'medium',
        titleEnc,
        descriptionEnc
      );

      const complaintId = result.lastInsertRowid;

      auditLog.log({
        userId,
        action: auditLog.ACTIONS.COMPLAINT_CREATED,
        resource: 'complaint',
        resourceId: String(complaintId),
        details: `Complaint created: ${category} (${is_anonymous ? 'anonymous' : 'identified'})`,
        ipAddress: req.ip,
      });

      const admins = dbHelper.prepare('SELECT id FROM users WHERE role = ? AND is_active = 1').all(ROLES.ADMIN);
      for (const admin of admins) {
        notification.create({
          userId: admin.id,
          type: notification.TYPES.COMPLAINT_SUBMITTED,
          message: `New ${category} complaint submitted (#${complaintId})`,
          complaintId,
        });
      }

      if (!is_anonymous) {
        notification.create({
          userId,
          type: notification.TYPES.COMPLAINT_SUBMITTED,
          message: `Your complaint #${complaintId} has been submitted successfully`,
          complaintId,
        });
      }

      res.status(201).json({ message: 'Complaint submitted successfully.', complaintId });
    } catch (err) {
      console.error('[COMPLAINT] Create error:', err.message);
      res.status(500).json({ error: 'Failed to submit complaint.' });
    }
  });

  // ====== LIST COMPLAINTS (role-filtered) ======
  router.get('/', requireAuth, (req, res) => {
    try {
      const { userId, role } = req.session;
      const { status, category, priority, page = 1, limit = 20 } = req.query;
      const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

      let sql = `SELECT c.*, u.full_name as submitter_name, s.full_name as assigned_name
                 FROM complaints c
                 LEFT JOIN users u ON c.user_id = u.id
                 LEFT JOIN users s ON c.assigned_to = s.id WHERE 1=1`;
      let countSql = 'SELECT COUNT(*) as total FROM complaints c WHERE 1=1';
      const params = [];
      const countParams = [];

      if (role === ROLES.STUDENT) {
        sql += ' AND c.user_id = ?';
        countSql += ' AND c.user_id = ?';
        params.push(userId);
        countParams.push(userId);
      } else if (role === ROLES.STAFF) {
        sql += ' AND c.assigned_to = ?';
        countSql += ' AND c.assigned_to = ?';
        params.push(userId);
        countParams.push(userId);
      }

      if (status) {
        sql += ' AND c.status = ?';
        countSql += ' AND c.status = ?';
        params.push(status);
        countParams.push(status);
      }
      if (category) {
        sql += ' AND c.category = ?';
        countSql += ' AND c.category = ?';
        params.push(category);
        countParams.push(category);
      }
      if (priority) {
        sql += ' AND c.priority = ?';
        countSql += ' AND c.priority = ?';
        params.push(priority);
        countParams.push(priority);
      }

      const countRow = dbHelper.prepare(countSql).get(...countParams);
      const total = countRow ? countRow.total : 0;

      sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      const complaints = dbHelper.prepare(sql).all(...params);

      const decrypted = complaints.map(c => {
        const d = decryptFields(c, ['title_enc']);
        return {
          id: d.id,
          title: d.title_enc,
          category: d.category,
          priority: d.priority,
          status: d.status,
          is_anonymous: d.is_anonymous,
          submitter_name: d.is_anonymous ? 'Anonymous' : (d.submitter_name || 'Unknown'),
          assigned_name: d.assigned_name || 'Unassigned',
          created_at: d.created_at,
          updated_at: d.updated_at,
          resolved_at: d.resolved_at,
        };
      });

      res.json({
        complaints: decrypted,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (err) {
      console.error('[COMPLAINT] List error:', err.message);
      res.status(500).json({ error: 'Failed to retrieve complaints.' });
    }
  });

  // ====== GET COMPLAINT DETAIL ======
  router.get('/:id', requireAuth, idParamValidation, complaintAccess(dbHelper), (req, res) => {
    try {
      const complaint = dbHelper.prepare(`
        SELECT c.*, u.full_name as submitter_name, u.email as submitter_email,
               s.full_name as assigned_name, s.username as assigned_username
        FROM complaints c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN users s ON c.assigned_to = s.id
        WHERE c.id = ?
      `).get(parseInt(req.params.id));

      if (!complaint) {
        return res.status(404).json({ error: 'Complaint not found.' });
      }

      const decrypted = decryptFields(complaint, ['title_enc', 'description_enc', 'resolution_enc']);

      const updates = dbHelper.prepare(`
        SELECT cu.*, u.full_name as author_name, u.role as author_role
        FROM complaint_updates cu
        JOIN users u ON cu.user_id = u.id
        WHERE cu.complaint_id = ?
        ORDER BY cu.created_at ASC
      `).all(parseInt(req.params.id));

      const decryptedUpdates = updates.map(u => {
        const d = decryptFields(u, ['content_enc']);
        return {
          id: d.id,
          content: d.content_enc,
          status_change: d.status_change,
          author_name: d.author_name,
          author_role: d.author_role,
          created_at: d.created_at,
        };
      });

      auditLog.log({
        userId: req.session.userId,
        action: auditLog.ACTIONS.COMPLAINT_VIEWED,
        resource: 'complaint',
        resourceId: String(req.params.id),
        details: `Complaint #${req.params.id} viewed`,
        ipAddress: req.ip,
      });

      res.json({
        complaint: {
          id: decrypted.id,
          title: decrypted.title_enc,
          description: decrypted.description_enc,
          resolution: decrypted.resolution_enc,
          category: decrypted.category,
          priority: decrypted.priority,
          status: decrypted.status,
          is_anonymous: decrypted.is_anonymous,
          submitter_name: decrypted.is_anonymous ? 'Anonymous' : decrypted.submitter_name,
          submitter_email: decrypted.is_anonymous ? null : decrypted.submitter_email,
          assigned_name: decrypted.assigned_name || 'Unassigned',
          assigned_username: decrypted.assigned_username,
          assigned_to: decrypted.assigned_to,
          created_at: decrypted.created_at,
          updated_at: decrypted.updated_at,
          resolved_at: decrypted.resolved_at,
          closed_at: decrypted.closed_at,
        },
        updates: decryptedUpdates,
      });
    } catch (err) {
      console.error('[COMPLAINT] Detail error:', err.message);
      res.status(500).json({ error: 'Failed to retrieve complaint.' });
    }
  });

  // ====== UPDATE STATUS ======
  router.put('/:id/status', requireAuth, requireRole(ROLES.STAFF, ROLES.ADMIN), idParamValidation, complaintAccess(dbHelper), (req, res) => {
    try {
      const { status, resolution } = req.body;
      const complaintId = parseInt(req.params.id);

      if (!['assigned', 'in_progress', 'resolved', 'closed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status.' });
      }

      const now = new Date().toISOString();

      if (status === 'resolved' && resolution) {
        const resEnc = encrypt(resolution);
        dbHelper.prepare(
          'UPDATE complaints SET status = ?, resolution_enc = ?, updated_at = ?, resolved_at = ? WHERE id = ?'
        ).run(status, resEnc, now, now, complaintId);
      } else if (status === 'closed') {
        dbHelper.prepare(
          'UPDATE complaints SET status = ?, updated_at = ?, closed_at = ? WHERE id = ?'
        ).run(status, now, now, complaintId);
      } else {
        dbHelper.prepare(
          'UPDATE complaints SET status = ?, updated_at = ? WHERE id = ?'
        ).run(status, now, complaintId);
      }

      auditLog.log({
        userId: req.session.userId,
        action: auditLog.ACTIONS.COMPLAINT_STATUS_CHANGED,
        resource: 'complaint',
        resourceId: String(complaintId),
        details: `Status changed to: ${status}`,
        ipAddress: req.ip,
      });

      const complaint = dbHelper.prepare('SELECT user_id, is_anonymous FROM complaints WHERE id = ?').get(complaintId);
      if (complaint && complaint.user_id && !complaint.is_anonymous) {
        notification.create({
          userId: complaint.user_id,
          type: notification.TYPES.COMPLAINT_STATUS_CHANGED,
          message: `Your complaint #${complaintId} status changed to: ${status}`,
          complaintId,
        });
      }

      res.json({ message: `Complaint status updated to: ${status}` });
    } catch (err) {
      console.error('[COMPLAINT] Status update error:', err.message);
      res.status(500).json({ error: 'Failed to update status.' });
    }
  });

  // ====== ASSIGN COMPLAINT ======
  router.put('/:id/assign', requireAuth, requireRole(ROLES.ADMIN), idParamValidation, (req, res) => {
    try {
      const { staff_id } = req.body;
      const complaintId = parseInt(req.params.id);

      const staff = dbHelper.prepare('SELECT id, full_name, role FROM users WHERE id = ? AND role = ?').get(staff_id, ROLES.STAFF);
      if (!staff) {
        return res.status(400).json({ error: 'Invalid staff member.' });
      }

      dbHelper.prepare(
        "UPDATE complaints SET assigned_to = ?, status = 'assigned', updated_at = datetime('now') WHERE id = ?"
      ).run(staff_id, complaintId);

      auditLog.log({
        userId: req.session.userId,
        action: auditLog.ACTIONS.COMPLAINT_ASSIGNED,
        resource: 'complaint',
        resourceId: String(complaintId),
        details: `Assigned to: ${staff.full_name} (ID: ${staff_id})`,
        ipAddress: req.ip,
      });

      notification.create({
        userId: staff_id,
        type: notification.TYPES.COMPLAINT_ASSIGNED,
        message: `Complaint #${complaintId} has been assigned to you`,
        complaintId,
      });

      res.json({ message: `Complaint assigned to ${staff.full_name}` });
    } catch (err) {
      console.error('[COMPLAINT] Assign error:', err.message);
      res.status(500).json({ error: 'Failed to assign complaint.' });
    }
  });

  // ====== ADD UPDATE/NOTE ======
  router.post('/:id/updates', requireAuth, idParamValidation, complaintAccess(dbHelper), complaintUpdateValidation, (req, res) => {
    try {
      const { content, status } = req.body;
      const complaintId = parseInt(req.params.id);
      const userId = req.session.userId;

      const contentEnc = encrypt(content);

      dbHelper.prepare(`
        INSERT INTO complaint_updates (complaint_id, user_id, content_enc, status_change, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(complaintId, userId, contentEnc, status || null);

      if (status) {
        dbHelper.prepare("UPDATE complaints SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, complaintId);
      }

      auditLog.log({
        userId,
        action: auditLog.ACTIONS.COMPLAINT_UPDATED,
        resource: 'complaint',
        resourceId: String(complaintId),
        details: `Update added${status ? ` with status change to: ${status}` : ''}`,
        ipAddress: req.ip,
      });

      res.status(201).json({ message: 'Update added successfully.' });
    } catch (err) {
      console.error('[COMPLAINT] Update error:', err.message);
      res.status(500).json({ error: 'Failed to add update.' });
    }
  });

  return router;
}

module.exports = createComplaintRouter;

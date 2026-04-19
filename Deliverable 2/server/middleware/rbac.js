// ============================================================
// RBAC and Rule-Based Access Control Middleware
// ============================================================

const { ROLES } = require('../config/security');

/**
 * Rule-based access check for complaint visibility.
 */
function complaintAccess(dbHelper) {
  return (req, res, next) => {
    const complaintId = req.params.id;
    if (!complaintId) return next();

    const complaint = dbHelper.prepare('SELECT id, user_id, assigned_to FROM complaints WHERE id = ?').get(parseInt(complaintId));
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    const { userId, role } = req.session;

    if (role === ROLES.ADMIN) {
      req.complaint = complaint;
      return next();
    }

    if (role === ROLES.STAFF) {
      if (complaint.assigned_to !== userId) {
        return res.status(403).json({ error: 'Access denied. This complaint is not assigned to you.' });
      }
      req.complaint = complaint;
      return next();
    }

    if (role === ROLES.STUDENT) {
      if (complaint.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied. You can only view your own complaints.' });
      }
      req.complaint = complaint;
      return next();
    }

    return res.status(403).json({ error: 'Access denied.' });
  };
}

const PERMISSIONS = {
  [ROLES.STUDENT]: {
    canSubmitComplaint: true,
    canViewOwnComplaints: true,
    canViewAssignedComplaints: false,
    canViewAllComplaints: false,
    canAssignComplaints: false,
    canManageUsers: false,
    canViewAuditLogs: false,
    canGenerateReports: false,
  },
  [ROLES.STAFF]: {
    canSubmitComplaint: false,
    canViewOwnComplaints: false,
    canViewAssignedComplaints: true,
    canViewAllComplaints: false,
    canAssignComplaints: false,
    canManageUsers: false,
    canViewAuditLogs: false,
    canGenerateReports: false,
  },
  [ROLES.ADMIN]: {
    canSubmitComplaint: true,
    canViewOwnComplaints: true,
    canViewAssignedComplaints: true,
    canViewAllComplaints: true,
    canAssignComplaints: true,
    canManageUsers: true,
    canViewAuditLogs: true,
    canGenerateReports: true,
  },
};

function hasPermission(role, permission) {
  return PERMISSIONS[role] && PERMISSIONS[role][permission] === true;
}

module.exports = { complaintAccess, PERMISSIONS, hasPermission };

// ============================================================
// Notification Service
// ============================================================
// In-app notification system for complaint updates.
// ============================================================

let dbHelper;

function init(helper) {
  dbHelper = helper;
}

function create({ userId, type, message, complaintId = null }) {
  if (!dbHelper) return;
  dbHelper.prepare(`
    INSERT INTO notifications (user_id, type, message, complaint_id, is_read, created_at)
    VALUES (?, ?, ?, ?, 0, datetime('now'))
  `).run(userId, type, message, complaintId);
}

function getUnread(userId) {
  return dbHelper.prepare(
    'SELECT * FROM notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC'
  ).all(userId);
}

function getAll(userId, limit = 50, offset = 0) {
  return dbHelper.prepare(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(userId, limit, offset);
}

function markRead(notificationId, userId) {
  return dbHelper.prepare(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
  ).run(notificationId, userId);
}

function markAllRead(userId) {
  return dbHelper.prepare(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0'
  ).run(userId);
}

function getUnreadCount(userId) {
  const row = dbHelper.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
  ).get(userId);
  return row ? row.count : 0;
}

const TYPES = {
  COMPLAINT_SUBMITTED: 'complaint_submitted',
  COMPLAINT_ASSIGNED: 'complaint_assigned',
  COMPLAINT_STATUS_CHANGED: 'complaint_status_changed',
  COMPLAINT_RESOLVED: 'complaint_resolved',
  COMPLAINT_UPDATE: 'complaint_update',
  SYSTEM: 'system',
};

module.exports = { init, create, getUnread, getAll, markRead, markAllRead, getUnreadCount, TYPES };

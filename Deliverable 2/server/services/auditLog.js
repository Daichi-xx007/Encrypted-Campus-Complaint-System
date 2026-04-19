// ============================================================
// Append-Only Audit Log Service
// ============================================================
// Implements tamper-evident logging with SHA-256 chain hashing.
// Each log entry includes a hash of the previous entry, forming
// an immutable chain that detects any modification.
// ============================================================

const crypto = require('crypto');

let dbHelper; // database helper wrapper

/**
 * Initialize audit log service with database helper reference
 */
function init(helper) {
  dbHelper = helper;
}

/**
 * Compute SHA-256 hash of a log entry for chain integrity.
 */
function computeHash(entry, prevHash) {
  const data = JSON.stringify({
    prevHash,
    userId: entry.userId,
    action: entry.action,
    resource: entry.resource,
    resourceId: entry.resourceId,
    details: entry.details,
    ipAddress: entry.ipAddress,
    timestamp: entry.timestamp,
  });
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Append a new audit log entry (immutable).
 */
function log({ userId = null, action, resource, resourceId = null, details = '', ipAddress = '' }) {
  if (!dbHelper) {
    console.error('[AUDIT] Database not initialized');
    return;
  }

  try {
    // Get the hash of the last entry for chain linking
    const lastEntry = dbHelper.prepare('SELECT hash FROM audit_logs ORDER BY id DESC LIMIT 1').get();
    const prevHash = lastEntry ? lastEntry.hash : '0'.repeat(64);

    const timestamp = new Date().toISOString();
    const entry = { userId, action, resource, resourceId, details, ipAddress, timestamp };
    const hash = computeHash(entry, prevHash);

    dbHelper.prepare(`
      INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, hash, prev_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, action, resource, resourceId, details, ipAddress, hash, prevHash, timestamp);
  } catch (e) {
    console.error('[AUDIT] Log error:', e.message);
  }
}

/**
 * Verify the integrity of the entire audit log chain.
 */
function verifyChain() {
  const entries = dbHelper.prepare('SELECT * FROM audit_logs ORDER BY id ASC').all();
  let prevHash = '0'.repeat(64);

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.prev_hash !== prevHash) {
      return { valid: false, brokenAt: entry.id, totalEntries: entries.length };
    }
    const expectedHash = computeHash({
      userId: entry.user_id,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resource_id,
      details: entry.details,
      ipAddress: entry.ip_address,
      timestamp: entry.created_at,
    }, prevHash);

    if (entry.hash !== expectedHash) {
      return { valid: false, brokenAt: entry.id, totalEntries: entries.length };
    }
    prevHash = entry.hash;
  }

  return { valid: true, brokenAt: null, totalEntries: entries.length };
}

const ACTIONS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  REGISTER: 'REGISTER',
  COMPLAINT_CREATED: 'COMPLAINT_CREATED',
  COMPLAINT_VIEWED: 'COMPLAINT_VIEWED',
  COMPLAINT_ASSIGNED: 'COMPLAINT_ASSIGNED',
  COMPLAINT_STATUS_CHANGED: 'COMPLAINT_STATUS_CHANGED',
  COMPLAINT_UPDATED: 'COMPLAINT_UPDATED',
  COMPLAINT_RESOLVED: 'COMPLAINT_RESOLVED',
  COMPLAINT_CLOSED: 'COMPLAINT_CLOSED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_STATUS_CHANGED: 'USER_STATUS_CHANGED',
  AUDIT_LOG_VIEWED: 'AUDIT_LOG_VIEWED',
  REPORT_GENERATED: 'REPORT_GENERATED',
  DATA_EXPORTED: 'DATA_EXPORTED',
};

module.exports = { init, log, verifyChain, ACTIONS };

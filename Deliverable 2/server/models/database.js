// ============================================================
// Database Model — sql.js (Pure JS SQLite via WASM)
// ============================================================
// Defines schema, creates tables, seeds default admin account.
// Uses parameterized queries throughout to prevent SQL injection.
// sql.js requires no native compilation — runs everywhere.
// ============================================================

const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { BCRYPT_SALT_ROUNDS, ROLES } = require('../config/security');

const DB_PATH = path.join(__dirname, '..', 'data', 'escms.db');
let db = null;

/**
 * Initialize and return the database instance.
 * sql.js is async for initialization (WASM loading).
 */
async function getDb() {
  if (db) return db;

  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const SQL = await initSqlJs();

  // Load existing database or create new
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  createTables();
  seedDefaultAdmin();
  saveDb(); // persist after seeding

  return db;
}

/**
 * Persist database to disk.
 */
function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/**
 * Auto-save interval (every 5 seconds if changes pending)
 */
let saveInterval = null;
function startAutoSave() {
  if (saveInterval) return;
  saveInterval = setInterval(() => {
    saveDb();
  }, 5000);
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student', 'staff', 'admin')),
      department TEXT DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      category TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'critical')),
      title_enc TEXT NOT NULL,
      description_enc TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted', 'assigned', 'in_progress', 'resolved', 'closed')),
      assigned_to INTEGER DEFAULT NULL,
      resolution_enc TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT DEFAULT NULL,
      closed_at TEXT DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS complaint_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content_enc TEXT NOT NULL,
      status_change TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (complaint_id) REFERENCES complaints(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      complaint_id INTEGER DEFAULT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER DEFAULT NULL,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      resource_id TEXT DEFAULT NULL,
      details TEXT DEFAULT '',
      ip_address TEXT DEFAULT '',
      hash TEXT NOT NULL,
      prev_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  // Indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_complaints_user ON complaints(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_complaints_assigned ON complaints(assigned_to)',
    'CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status)',
    'CREATE INDEX IF NOT EXISTS idx_updates_complaint ON complaint_updates(complaint_id)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)',
    'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
  ];
  indexes.forEach(sql => db.run(sql));
}

function seedDefaultAdmin() {
  const result = db.exec("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (result.length === 0 || result[0].values.length === 0) {
    const passwordHash = bcrypt.hashSync('Admin@12345', BCRYPT_SALT_ROUNDS);
    db.run(
      `INSERT INTO users (username, email, password_hash, full_name, role, department)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['admin', 'admin@institution.edu', passwordHash, 'System Administrator', ROLES.ADMIN, 'IT Department']
    );
    console.log('[DB] Default admin created — username: admin, password: Admin@12345');
  }
}

// ============================================================
// Helper wrappers to provide a better-sqlite3-like API
// ============================================================

/**
 * Create a prepared-statement-like interface compatible with
 * the route handlers that expect .get() / .all() / .run() style.
 */
function prepare(sql) {
  return {
    get(...params) {
      try {
        const stmt = db.prepare(sql);
        if (params.length) stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      } catch (e) {
        console.error('[DB] get error:', e.message, sql);
        return undefined;
      }
    },
    all(...params) {
      try {
        const results = [];
        const stmt = db.prepare(sql);
        if (params.length) stmt.bind(params);
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      } catch (e) {
        console.error('[DB] all error:', e.message, sql);
        return [];
      }
    },
    run(...params) {
      try {
        db.run(sql, params);
        saveDb(); // persist changes
        const lastId = db.exec('SELECT last_insert_rowid() as id');
        const changes = db.getRowsModified();
        return {
          lastInsertRowid: lastId.length > 0 ? lastId[0].values[0][0] : 0,
          changes,
        };
      } catch (e) {
        console.error('[DB] run error:', e.message, sql);
        return { lastInsertRowid: 0, changes: 0 };
      }
    },
  };
}

/**
 * Execute raw SQL (for multi-statement setup, etc.)
 */
function exec(sql) {
  return db.exec(sql);
}

module.exports = { getDb, saveDb, startAutoSave, prepare, exec };

// ============================================================
// Encrypted Smart Complaint Management System — Server Entry
// ============================================================

const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

const { SESSION_SECRET, SESSION_MAX_AGE, SESSION_NAME } = require('./config/security');
const { getDb, prepare, startAutoSave } = require('./models/database');
const auditLog = require('./services/auditLog');
const notification = require('./services/notification');
const { securityHeaders } = require('./middleware/securityHeaders');
const { csrfProtection } = require('./middleware/csrf');
const { apiLimiter } = require('./middleware/rateLimiter');
const createAuthRouter = require('./routes/auth');
const createComplaintRouter = require('./routes/complaints');
const createAdminRouter = require('./routes/admin');
const createNotificationRouter = require('./routes/notifications');

async function startServer() {
  // Initialize database (async for sql.js WASM loading)
  await getDb();

  // Create a helper object with the prepare function
  const dbHelper = { prepare };

  // Initialize services
  auditLog.init(dbHelper);
  notification.init(dbHelper);

  // Start auto-save
  startAutoSave();

  const app = express();
  const PORT = process.env.PORT || 5000;

  // ---- Middleware Stack ----

  // 1. Security headers
  app.use(securityHeaders());

  // 2. CORS
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-csrf-token'],
  }));

  // 3. Body parsers with size limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  // 4. Cookie parser
  app.use(cookieParser());

  // 5. Session management
  app.use(session({
    name: SESSION_NAME,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    },
  }));

  // 6. Rate limiting
  app.use('/api', apiLimiter);

  // 7. CSRF protection
  app.use('/api', csrfProtection);

  // ---- Routes ----
  app.use('/api/auth', createAuthRouter(dbHelper));
  app.use('/api/complaints', createComplaintRouter(dbHelper));
  app.use('/api/admin', createAdminRouter(dbHelper));
  app.use('/api/notifications', createNotificationRouter(dbHelper));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString(), uptime: process.uptime() });
  });

  // Serve static frontend in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
    });
  }

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('[SERVER ERROR]', err.message);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message,
    });
  });

  app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  ESCMS Server running on port ${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  API: http://localhost:${PORT}/api`);
    console.log(`========================================\n`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

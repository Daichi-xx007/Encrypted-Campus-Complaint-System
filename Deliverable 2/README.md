# Encrypted Smart Complaint Management System (ESCMS)

A **security-first** web-based complaint management system for educational institutions. Implements enterprise-grade security controls including AES-256-GCM encryption, bcrypt authentication, RBAC, CSRF protection, and chain-hashed audit logging.

---

## 🔒 Security Features

| Feature | Implementation |
|---------|---------------|
| **Password Hashing** | bcrypt with 12 salt rounds |
| **Encryption at Rest** | AES-256-GCM for complaint data |
| **Session Security** | HTTPOnly, SameSite, secure cookies |
| **CSRF Protection** | Double-submit cookie pattern |
| **Input Validation** | express-validator + HTML entity encoding |
| **Rate Limiting** | Login: 5/15min, API: 100/min |
| **Access Control** | Role-Based (RBAC) + Rule-Based (ReBAC) |
| **Audit Logging** | SHA-256 chain-hashed, append-only |
| **Security Headers** | Helmet with strict CSP |
| **SQL Injection** | Parameterized queries throughout |

---

## 👥 User Roles

| Role | Capabilities |
|------|-------------|
| **Student** | Submit complaints (anonymous/identified), track status, view history |
| **Staff** | View assigned complaints, update resolution status |
| **Admin** | Full access: user management, reporting, audit logs, configuration |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed

### Installation

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Running in Development

**Terminal 1 — Server:**
```bash
cd server
npm run dev
```

**Terminal 2 — Client:**
```bash
cd client
npm run dev
```

The app will be available at `http://localhost:5173`

### Default Admin Account
- **Username:** `admin`
- **Password:** `Admin@12345`

> ⚠️ **Change the default admin password immediately after first login in production.**

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────┐
│                  Frontend                     │
│           React + Vite + Vanilla CSS          │
│    ┌──────────────────────────────────────┐   │
│    │  CSRF Token Interceptor (Axios)      │   │
│    │  Auth Context (Session-based)        │   │
│    │  Role-based Route Protection         │   │
│    └──────────────────────────────────────┘   │
└───────────────────────┬──────────────────────┘
                        │ HTTP + CSRF Token
┌───────────────────────┴──────────────────────┐
│                  Backend                      │
│              Node.js + Express                │
│  ┌────────────────────────────────────────┐   │
│  │  Security Middleware Stack:            │   │
│  │  1. Helmet (Security Headers + CSP)    │   │
│  │  2. CORS (Credential-aware)            │   │
│  │  3. Session (HTTPOnly cookies)         │   │
│  │  4. Rate Limiter (per-endpoint)        │   │
│  │  5. CSRF (Double-submit cookie)        │   │
│  │  6. Input Validator (express-validator) │   │
│  │  7. RBAC + ReBAC (least privilege)     │   │
│  └────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────┐   │
│  │  Services:                             │   │
│  │  • AES-256-GCM Encryption Engine       │   │
│  │  • SHA-256 Chain-Hashed Audit Logger   │   │
│  │  • In-App Notification Service         │   │
│  └────────────────────────────────────────┘   │
└───────────────────────┬──────────────────────┘
                        │ Parameterized Queries
┌───────────────────────┴──────────────────────┐
│                Data Layer                     │
│          SQLite (sql.js / WASM)               │
│  • Encrypted complaint fields (AES-256-GCM)   │
│  • Chain-hashed audit log table               │
│  • Indexed for performance                    │
└──────────────────────────────────────────────┘
```

---

## 🛡️ STRIDE Threat Model

| Threat | Mitigation |
|--------|-----------|
| **Spoofing** | bcrypt hashing, secure sessions, rate limiting |
| **Tampering** | Parameterized queries, CSRF tokens, input validation |
| **Repudiation** | SHA-256 chain-hashed append-only audit logs |
| **Information Disclosure** | AES-256-GCM encryption, least privilege RBAC |
| **Denial of Service** | Rate limiting, input size limits, body parser limits |
| **Elevation of Privilege** | Strict RBAC, rule-based access, session validation |

---

## 📁 Project Structure

```
Delieverable-2/
├── server/
│   ├── index.js                 # Express app entry
│   ├── config/security.js       # Security constants
│   ├── middleware/
│   │   ├── auth.js              # Authentication guards
│   │   ├── rbac.js              # RBAC + rule-based access
│   │   ├── csrf.js              # CSRF protection
│   │   ├── rateLimiter.js       # Rate limiting
│   │   ├── inputValidator.js    # Input validation
│   │   └── securityHeaders.js   # Helmet + CSP
│   ├── models/database.js       # SQLite schema + queries
│   ├── services/
│   │   ├── encryption.js        # AES-256-GCM engine
│   │   ├── auditLog.js          # Chain-hashed audit logger
│   │   └── notification.js      # In-app notifications
│   ├── routes/
│   │   ├── auth.js              # Login/register/logout
│   │   ├── complaints.js        # Complaint CRUD + workflow
│   │   ├── admin.js             # Admin operations
│   │   └── notifications.js     # Notification endpoints
│   └── data/                    # SQLite database (auto-created)
├── client/
│   ├── src/
│   │   ├── App.jsx              # Router + route definitions
│   │   ├── index.css            # Design system
│   │   ├── context/AuthContext.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx       # Sidebar + header + notifications
│   │   │   └── ProtectedRoute.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── SubmitComplaint.jsx
│   │   │   ├── ComplaintDetail.jsx
│   │   │   ├── MyComplaints.jsx
│   │   │   ├── AssignedComplaints.jsx
│   │   │   ├── UserManagement.jsx
│   │   │   ├── AuditLogs.jsx
│   │   │   └── Reports.jsx
│   │   └── utils/api.js         # Axios with CSRF interceptor
│   └── vite.config.js           # Dev server + API proxy
├── .env.example
└── README.md
```

---

## 🔐 Security Testing Checklist

- [x] Parameterized queries (no string concatenation in SQL)
- [x] bcrypt password hashing with 12 salt rounds
- [x] AES-256-GCM encryption for complaint data
- [x] CSRF token validation on all mutations
- [x] HTTPOnly secure session cookies
- [x] Rate limiting on login and API endpoints
- [x] Input validation and sanitization
- [x] Content Security Policy headers
- [x] RBAC + ReBAC access control
- [x] Chain-hashed audit logs with integrity verification
- [x] Session fixation prevention (regenerate on login)
- [x] Account lockout after 5 failed attempts
- [x] Generic error messages (no username enumeration)

---

## 📄 License

This project is for educational purposes as part of a Secure Software Development course.

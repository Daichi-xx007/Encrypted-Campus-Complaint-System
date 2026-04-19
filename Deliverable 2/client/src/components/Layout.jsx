import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Layout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function fetchNotifications() {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {}
  }

  async function markAllRead() {
    try {
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch {}
  }

  const pageTitle = {
    '/dashboard': 'Dashboard',
    '/admin/dashboard': 'Admin Control Center',
    '/submit-complaint': 'Submit Complaint',
    '/my-complaints': 'My Complaints',
    '/assigned-complaints': 'Assigned Complaints',
    '/admin/users': 'User Management',
    '/admin/audit-logs': 'Audit Logs',
    '/admin/reports': 'Reports & Analytics',
  }[location.pathname] || 'Dashboard';

  function getInitials(name) {
    return name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '??';
  }

  const navLinks = [];

  // Common
  navLinks.push({ section: 'Main', links: [
    { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  ]});

  // Student
  if (user?.role === 'student' || user?.role === 'admin') {
    navLinks.push({ section: 'Complaints', links: [
      { to: '/submit-complaint', icon: '📝', label: 'Submit Complaint' },
      { to: '/my-complaints', icon: '📋', label: 'My Complaints' },
    ]});
  }

  // Staff
  if (user?.role === 'staff') {
    navLinks.push({ section: 'Work', links: [
      { to: '/assigned-complaints', icon: '📌', label: 'Assigned to Me' },
    ]});
  }

  // Admin
  if (user?.role === 'admin') {
    navLinks.push({ section: 'Administration', links: [
      { to: '/admin/dashboard', icon: '🎛️', label: 'Admin Dashboard' },
      { to: '/assigned-complaints', icon: '📌', label: 'All Complaints' },
      { to: '/admin/users', icon: '👥', label: 'User Management' },
      { to: '/admin/audit-logs', icon: '🔒', label: 'Audit Logs' },
      { to: '/admin/reports', icon: '📈', label: 'Reports' },
    ]});
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">🛡️</div>
            <div>
              <div className="sidebar-brand-text">ESCMS</div>
              <div className="sidebar-brand-sub">Secure Complaints</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navLinks.map((section, i) => (
            <div className="sidebar-section" key={i}>
              <div className="sidebar-section-title">{section.section}</div>
              {section.links.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <span className="link-icon">{link.icon}</span>
                  {link.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-avatar">{getInitials(user?.full_name)}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.full_name}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
          <button
            className="sidebar-link"
            onClick={logout}
            style={{ width: 'auto', padding: '8px', flexShrink: 0 }}
            title="Logout"
          >
            🚪
          </button>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="main-content">
        <header className="main-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
            <h2>{pageTitle}</h2>
          </div>
          <div className="header-actions" ref={notifRef}>
            <div style={{ position: 'relative' }}>
              <button className="notification-btn" onClick={() => setNotifOpen(!notifOpen)}>
                🔔
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>
              {notifOpen && (
                <div className="notifications-dropdown">
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="btn btn-sm btn-secondary">Mark all read</button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No notifications
                    </div>
                  ) : (
                    notifications.slice(0, 10).map(n => (
                      <div key={n.id} className={`notification-item ${n.is_read ? '' : 'unread'}`}>
                        <div className="notif-message">{n.message}</div>
                        <div className="notif-time">{new Date(n.created_at).toLocaleString()}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="page-content fade-in">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

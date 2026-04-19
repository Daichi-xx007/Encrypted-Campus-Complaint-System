import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [auditRecent, setAuditRecent] = useState([]);
  const [integrity, setIntegrity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    try {
      const [reportsRes, complaintsRes, auditRes, integrityRes] = await Promise.all([
        api.get('/admin/reports'),
        api.get('/complaints?limit=5'),
        api.get('/admin/audit-logs?limit=8'),
        api.get('/admin/audit-logs/verify'),
      ]);
      setStats(reportsRes.data);
      setRecent(complaintsRes.data.complaints || []);
      setAuditRecent(auditRes.data.logs || []);
      setIntegrity(integrityRes.data);
    } catch (err) {
      console.error('Admin dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <span>Loading admin dashboard...</span>
      </div>
    );
  }

  if (!stats) {
    return <div className="alert alert-error">⚠️ Failed to load admin data.</div>;
  }

  const s = stats.summary;
  const openCount = (stats.byStatus || [])
    .filter(x => ['submitted', 'assigned', 'in_progress'].includes(x.status))
    .reduce((a, b) => a + b.count, 0);
  const maxStatus = Math.max(...(stats.byStatus || []).map(x => x.count), 1);
  const maxCategory = Math.max(...(stats.byCategory || []).map(x => x.count), 1);

  const statusColors = {
    submitted: 'var(--accent-blue)',
    assigned: 'var(--accent-purple)',
    in_progress: 'var(--accent-amber)',
    resolved: 'var(--accent-emerald)',
    closed: 'var(--text-muted)',
  };

  const priorityColors = {
    low: 'var(--text-muted)',
    medium: 'var(--accent-blue)',
    high: 'var(--accent-amber)',
    critical: 'var(--accent-red)',
  };

  return (
    <div className="slide-in">
      {/* Welcome Header */}
      <div className="admin-welcome">
        <div>
          <h1 className="admin-welcome-title">Admin Control Center</h1>
          <p className="admin-welcome-sub">Welcome back, {user.full_name}. Here's your system overview.</p>
        </div>
        <div className="admin-welcome-actions">
          <Link to="/admin/users" className="btn btn-secondary">👥 Users</Link>
          <Link to="/admin/audit-logs" className="btn btn-secondary">🔒 Audit</Link>
          <Link to="/admin/reports" className="btn btn-primary">📈 Full Reports</Link>
        </div>
      </div>

      {/* Security Status Banner */}
      <div className={`admin-security-banner ${integrity?.valid ? 'secure' : 'warning'}`}>
        <div className="admin-security-icon">
          {integrity?.valid ? '🛡️' : '⚠️'}
        </div>
        <div className="admin-security-info">
          <div className="admin-security-title">
            {integrity?.valid ? 'System Security: Intact' : 'Security Alert: Integrity Issue Detected'}
          </div>
          <div className="admin-security-detail">
            {integrity?.valid
              ? `Audit chain verified — ${integrity.totalEntries} entries, all hashes valid. AES-256-GCM encryption active.`
              : `Chain integrity broken at entry #${integrity?.brokenAt}. Investigation required.`}
          </div>
        </div>
        <Link to="/admin/audit-logs" className="btn btn-sm btn-secondary">View Audit Trail →</Link>
      </div>

      {/* KPI Cards */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-icon indigo">📊</span>
            <span className="admin-kpi-trend up">↗</span>
          </div>
          <div className="admin-kpi-value">{s.totalComplaints}</div>
          <div className="admin-kpi-label">Total Complaints</div>
          <div className="admin-kpi-bar">
            <div className="admin-kpi-bar-fill indigo" style={{ width: '100%' }} />
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-icon amber">⏳</span>
          </div>
          <div className="admin-kpi-value">{openCount}</div>
          <div className="admin-kpi-label">Open / Pending</div>
          <div className="admin-kpi-bar">
            <div className="admin-kpi-bar-fill amber" style={{ width: s.totalComplaints > 0 ? `${(openCount / s.totalComplaints) * 100}%` : '0%' }} />
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-icon emerald">✅</span>
            <span className="admin-kpi-trend up">{s.resolutionRate}%</span>
          </div>
          <div className="admin-kpi-value">{s.resolvedComplaints}</div>
          <div className="admin-kpi-label">Resolved</div>
          <div className="admin-kpi-bar">
            <div className="admin-kpi-bar-fill emerald" style={{ width: `${s.resolutionRate}%` }} />
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-icon cyan">⏱️</span>
          </div>
          <div className="admin-kpi-value">{s.avgResolutionDays}</div>
          <div className="admin-kpi-label">Avg Resolution (days)</div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-icon purple">👥</span>
          </div>
          <div className="admin-kpi-value">{s.totalUsers}</div>
          <div className="admin-kpi-label">Total Users</div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-icon blue">📅</span>
          </div>
          <div className="admin-kpi-value">{s.recentComplaints}</div>
          <div className="admin-kpi-label">Last 30 Days</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="admin-charts-row">
        {/* Status Distribution */}
        <div className="card admin-chart-card">
          <div className="card-header">
            <h3 className="card-title">Status Distribution</h3>
          </div>
          <div className="admin-bar-chart">
            {(stats.byStatus || []).map(item => (
              <div key={item.status} className="admin-bar-row">
                <div className="admin-bar-label">
                  <span className={`status-badge ${item.status}`}>{item.status.replace('_', ' ')}</span>
                </div>
                <div className="admin-bar-track">
                  <div
                    className="admin-bar-fill-animated"
                    style={{
                      width: `${(item.count / maxStatus) * 100}%`,
                      background: statusColors[item.status] || 'var(--accent-indigo)',
                    }}
                  />
                </div>
                <div className="admin-bar-value">{item.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="card admin-chart-card">
          <div className="card-header">
            <h3 className="card-title">Category Breakdown</h3>
          </div>
          <div className="admin-bar-chart">
            {(stats.byCategory || []).map((item, i) => {
              const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];
              return (
                <div key={item.category} className="admin-bar-row">
                  <div className="admin-bar-label" style={{ minWidth: '130px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.category}</span>
                  </div>
                  <div className="admin-bar-track">
                    <div
                      className="admin-bar-fill-animated"
                      style={{
                        width: `${(item.count / maxCategory) * 100}%`,
                        background: colors[i % colors.length],
                      }}
                    />
                  </div>
                  <div className="admin-bar-value">{item.count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="admin-bottom-row">
        {/* Recent Complaints */}
        <div className="card admin-recent-card">
          <div className="card-header">
            <h3 className="card-title">Recent Complaints</h3>
            <Link to="/assigned-complaints" className="btn btn-sm btn-secondary">View All →</Link>
          </div>
          {recent.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-title">No complaints yet</div>
            </div>
          ) : (
            <div className="admin-recent-list">
              {recent.map(c => (
                <Link to={`/complaints/${c.id}`} className="admin-recent-item" key={c.id}>
                  <div className="admin-recent-id">#{c.id}</div>
                  <div className="admin-recent-body">
                    <div className="admin-recent-title">{c.title}</div>
                    <div className="admin-recent-meta">
                      <span>{c.category}</span>
                      <span>•</span>
                      <span>{c.is_anonymous ? '🔒 Anon' : c.submitter_name}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                    <span className={`priority-badge ${c.priority}`}>{c.priority}</span>
                    <span className={`status-badge ${c.status}`}>{c.status.replace('_', ' ')}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity Feed */}
        <div className="card admin-activity-card">
          <div className="card-header">
            <h3 className="card-title">Activity Feed</h3>
            <Link to="/admin/audit-logs" className="btn btn-sm btn-secondary">Full Logs →</Link>
          </div>
          <div className="admin-activity-feed">
            {auditRecent.map(log => (
              <div className="admin-activity-item" key={log.id}>
                <div className={`admin-activity-dot ${
                  log.action.includes('FAILED') ? 'red' :
                  log.action.includes('SUCCESS') || log.action.includes('CREATED') ? 'emerald' :
                  log.action.includes('CHANGED') || log.action.includes('ASSIGNED') ? 'amber' : 'indigo'
                }`} />
                <div className="admin-activity-content">
                  <div className="admin-activity-action">
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      background: log.action.includes('FAILED') ? 'rgba(239,68,68,0.15)' :
                        log.action.includes('SUCCESS') || log.action.includes('CREATED') ? 'rgba(16,185,129,0.15)' :
                        'rgba(99,102,241,0.15)',
                      color: log.action.includes('FAILED') ? 'var(--accent-red)' :
                        log.action.includes('SUCCESS') || log.action.includes('CREATED') ? 'var(--accent-emerald)' :
                        'var(--accent-indigo-light)',
                    }}>
                      {log.action}
                    </span>
                  </div>
                  <div className="admin-activity-detail">{log.details}</div>
                  <div className="admin-activity-time">
                    {log.username || 'System'} • {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Priority & Users Row */}
      <div className="admin-charts-row" style={{ marginTop: '24px' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Priority Distribution</h3>
          </div>
          <div className="admin-priority-grid">
            {(stats.byPriority || []).map(item => (
              <div key={item.priority} className="admin-priority-card">
                <div className="admin-priority-value">{item.count}</div>
                <span className={`priority-badge ${item.priority}`}>{item.priority}</span>
                <div className="admin-priority-bar">
                  <div
                    className="admin-priority-bar-fill"
                    style={{
                      width: s.totalComplaints > 0 ? `${(item.count / s.totalComplaints) * 100}%` : '0%',
                      background: priorityColors[item.priority],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Users by Role</h3>
          </div>
          <div className="admin-role-grid">
            {(stats.usersByRole || []).map(item => (
              <div key={item.role} className="admin-role-card">
                <div className="admin-role-icon">
                  {item.role === 'admin' ? '👑' : item.role === 'staff' ? '💼' : '🎓'}
                </div>
                <div className="admin-role-value">{item.count}</div>
                <span className={`role-badge ${item.role}`}>{item.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions (bottom) */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Quick Actions</h3>
        </div>
        <div className="admin-quick-actions">
          <Link to="/submit-complaint" className="admin-action-btn">
            <span className="admin-action-icon">📝</span>
            <span className="admin-action-label">Submit Complaint</span>
          </Link>
          <Link to="/assigned-complaints" className="admin-action-btn">
            <span className="admin-action-icon">📋</span>
            <span className="admin-action-label">All Complaints</span>
          </Link>
          <Link to="/admin/users" className="admin-action-btn">
            <span className="admin-action-icon">👥</span>
            <span className="admin-action-label">Manage Users</span>
          </Link>
          <Link to="/admin/audit-logs" className="admin-action-btn">
            <span className="admin-action-icon">🔒</span>
            <span className="admin-action-label">Audit Logs</span>
          </Link>
          <Link to="/admin/reports" className="admin-action-btn">
            <span className="admin-action-icon">📈</span>
            <span className="admin-action-label">Reports</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

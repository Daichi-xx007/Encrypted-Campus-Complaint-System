import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchReports(); }, []);

  async function fetchReports() {
    try {
      const res = await api.get('/admin/reports');
      setData(res.data);
    } catch (err) {
      console.error('Reports error:', err);
    } finally {
      setLoading(false);
    }
  }

  function exportSummary() {
    if (!data) return;
    const s = data.summary;
    let content = `ESCMS System Report — ${new Date().toLocaleDateString()}\n`;
    content += `${'='.repeat(50)}\n\n`;
    content += `SUMMARY\n`;
    content += `Total Complaints: ${s.totalComplaints}\n`;
    content += `Resolved Complaints: ${s.resolvedComplaints}\n`;
    content += `Resolution Rate: ${s.resolutionRate}%\n`;
    content += `Avg Resolution Time: ${s.avgResolutionDays} days\n`;
    content += `Complaints (Last 30 Days): ${s.recentComplaints}\n`;
    content += `Total Users: ${s.totalUsers}\n\n`;

    content += `BY STATUS\n`;
    (data.byStatus || []).forEach(i => { content += `  ${i.status}: ${i.count}\n`; });
    content += `\nBY CATEGORY\n`;
    (data.byCategory || []).forEach(i => { content += `  ${i.category}: ${i.count}\n`; });
    content += `\nBY PRIORITY\n`;
    (data.byPriority || []).forEach(i => { content += `  ${i.priority}: ${i.count}\n`; });
    content += `\nUSERS BY ROLE\n`;
    (data.usersByRole || []).forEach(i => { content += `  ${i.role}: ${i.count}\n`; });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `escms-report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="loading-container"><div className="spinner" /><span>Generating reports...</span></div>;
  }

  if (!data) return <div className="alert alert-error">Failed to load reports.</div>;

  const maxCategory = Math.max(...(data.byCategory || []).map(c => c.count), 1);
  const maxStatus = Math.max(...(data.byStatus || []).map(s => s.count), 1);
  const s = data.summary;
  const tc = s.totalComplaints || 1;

  const statusColors = {
    submitted: '#3b82f6',
    assigned: '#8b5cf6',
    in_progress: '#f59e0b',
    resolved: '#10b981',
    closed: '#64748b',
  };

  const categoryColors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];
  const priorityConfig = {
    low: { color: '#64748b', icon: '🟢' },
    medium: { color: '#3b82f6', icon: '🔵' },
    high: { color: '#f59e0b', icon: '🟡' },
    critical: { color: '#ef4444', icon: '🔴' },
  };

  // Calculate donut data
  const statusTotal = (data.byStatus || []).reduce((a, b) => a + b.count, 0) || 1;
  let statusAccumulated = 0;

  return (
    <div className="slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-white)', marginBottom: '4px' }}>
            Reports & Analytics
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            System-wide complaint statistics, trends, and insights
          </p>
        </div>
        <button className="btn btn-secondary" onClick={exportSummary}>📥 Export Report</button>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon indigo">📊</div>
          <div className="stat-info">
            <div className="stat-value">{s.totalComplaints}</div>
            <div className="stat-label">Total Complaints</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon emerald">✅</div>
          <div className="stat-info">
            <div className="stat-value">{s.resolvedComplaints}</div>
            <div className="stat-label">Resolved</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan">📈</div>
          <div className="stat-info">
            <div className="stat-value">{s.resolutionRate}%</div>
            <div className="stat-label">Resolution Rate</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">⏱️</div>
          <div className="stat-info">
            <div className="stat-value">{s.avgResolutionDays}</div>
            <div className="stat-label">Avg Resolution (days)</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">📅</div>
          <div className="stat-info">
            <div className="stat-value">{s.recentComplaints}</div>
            <div className="stat-label">Last 30 Days</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">👥</div>
          <div className="stat-info">
            <div className="stat-value">{s.totalUsers}</div>
            <div className="stat-label">Total Users</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* By Status */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Complaints by Status</h3>
          </div>
          {/* Visual donut */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '20px' }}>
            <div className="report-donut">
              <svg viewBox="0 0 36 36" style={{ width: '120px', height: '120px', transform: 'rotate(-90deg)' }}>
                {(data.byStatus || []).map((item, i) => {
                  const pct = (item.count / statusTotal) * 100;
                  const offset = statusAccumulated;
                  statusAccumulated += pct;
                  return (
                    <circle key={item.status} cx="18" cy="18" r="14" fill="none"
                      stroke={statusColors[item.status] || '#6366f1'}
                      strokeWidth="4"
                      strokeDasharray={`${pct} ${100 - pct}`}
                      strokeDashoffset={`${-offset}`}
                      style={{ transition: 'all 0.5s ease' }}
                    />
                  );
                })}
                <circle cx="18" cy="18" r="10" fill="var(--bg-card)" />
              </svg>
              <div className="report-donut-center">
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-white)' }}>{s.totalComplaints}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>TOTAL</div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              {(data.byStatus || []).map(item => (
                <div key={item.status} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: statusColors[item.status], flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', flex: 1, textTransform: 'capitalize' }}>
                    {item.status.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.count}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: '40px' }}>
                    {((item.count / statusTotal) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* By Category */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Complaints by Category</h3>
          </div>
          {(data.byCategory || []).map((item, i) => (
            <div key={item.category} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.category}</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.count}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    ({((item.count / tc) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
              <div style={{ height: '8px', background: 'var(--bg-glass)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${(item.count / maxCategory) * 100}%`,
                  height: '100%',
                  background: categoryColors[i % categoryColors.length],
                  borderRadius: '4px',
                  transition: 'width 0.8s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* By Priority & Users */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Priority Distribution</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {(data.byPriority || []).map(item => {
              const config = priorityConfig[item.priority] || { color: '#6366f1', icon: '⚪' };
              const pct = tc > 0 ? ((item.count / tc) * 100).toFixed(0) : 0;
              return (
                <div key={item.priority} style={{
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '20px',
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${pct}%`, background: `${config.color}10`, transition: 'height 0.5s ease' }} />
                  <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{config.icon}</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-white)', position: 'relative' }}>{item.count}</div>
                  <span className={`priority-badge ${item.priority}`} style={{ position: 'relative' }}>{item.priority}</span>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', position: 'relative' }}>{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Users by Role</h3>
          </div>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', padding: '20px 0' }}>
            {(data.usersByRole || []).map(item => (
              <div key={item.role} style={{
                flex: 1,
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-md)',
                padding: '24px 16px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>
                  {item.role === 'admin' ? '👑' : item.role === 'staff' ? '💼' : '🎓'}
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-white)' }}>{item.count}</div>
                <span className={`role-badge ${item.role}`}>{item.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security Footer */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="stat-icon emerald" style={{ width: '40px', height: '40px', fontSize: '1rem' }}>🔒</div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Report Data Integrity</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Statistics compiled from AES-256-GCM encrypted complaint data. All operations logged with SHA-256 chain-hashed audit trail.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ action: '', user_id: '', page: 1 });
  const [integrity, setIntegrity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => { fetchLogs(); }, [filters]);

  async function fetchUsers() {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.users || []);
    } catch {}
  }

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.action) params.set('action', filters.action);
      if (filters.user_id) params.set('user_id', filters.user_id);
      params.set('page', filters.page);
      params.set('limit', 30);

      const res = await api.get(`/admin/audit-logs?${params}`);
      setLogs(res.data.logs || []);
      setPagination(res.data.pagination || {});
    } catch (err) {
      console.error('Fetch audit logs error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function verifyIntegrity() {
    try {
      const res = await api.get('/admin/audit-logs/verify');
      setIntegrity(res.data);
    } catch (err) {
      console.error('Verify error:', err);
    }
  }

  function exportLogs() {
    const header = 'ID,Timestamp,User,Action,Resource,Details,IP,Hash\n';
    const rows = logs.map(l =>
      `${l.id},"${l.created_at}","${l.username || ''}","${l.action}","${l.resource}","${(l.details || '').replace(/"/g, '""')}","${l.ip_address}","${l.hash}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-page${filters.page}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const actionTypes = [
    'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'REGISTER',
    'COMPLAINT_CREATED', 'COMPLAINT_VIEWED', 'COMPLAINT_ASSIGNED',
    'COMPLAINT_STATUS_CHANGED', 'COMPLAINT_UPDATED',
    'USER_ROLE_CHANGED', 'USER_STATUS_CHANGED',
    'AUDIT_LOG_VIEWED', 'REPORT_GENERATED',
  ];

  function getActionStyle(action) {
    if (action.includes('FAILED')) return { bg: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)' };
    if (action.includes('SUCCESS') || action.includes('CREATED') || action === 'REGISTER')
      return { bg: 'rgba(16,185,129,0.15)', color: 'var(--accent-emerald)' };
    if (action.includes('CHANGED') || action.includes('ASSIGNED'))
      return { bg: 'rgba(245,158,11,0.15)', color: 'var(--accent-amber)' };
    if (action === 'LOGOUT') return { bg: 'rgba(100,116,139,0.15)', color: 'var(--text-muted)' };
    return { bg: 'rgba(99,102,241,0.15)', color: 'var(--accent-indigo-light)' };
  }

  return (
    <div className="slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-white)', marginBottom: '4px' }}>Audit Logs</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            SHA-256 chain-hashed append-only audit trail — {pagination.total || 0} entries
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={exportLogs} title="Export current page as CSV">
            📥 Export CSV
          </button>
          <button className="btn btn-secondary" onClick={verifyIntegrity}>🔗 Verify Chain Integrity</button>
        </div>
      </div>

      {integrity && (
        <div className={`alert ${integrity.valid ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '20px' }}>
          {integrity.valid
            ? `✅ Audit log integrity verified — ${integrity.totalEntries} entries, SHA-256 chain intact`
            : `⚠️ Integrity violation detected at entry #${integrity.brokenAt}. The audit log may have been tampered with.`}
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <select className="form-control" value={filters.action}
          onChange={e => setFilters(prev => ({ ...prev, action: e.target.value, page: 1 }))}>
          <option value="">All Actions</option>
          {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="form-control" value={filters.user_id}
          onChange={e => setFilters(prev => ({ ...prev, user_id: e.target.value, page: 1 }))}>
          <option value="">All Users</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.full_name} (@{u.username})</option>)}
        </select>
        <button className="btn btn-sm btn-secondary"
          onClick={() => setFilters({ action: '', user_id: '', page: 1 })}>
          Clear Filters
        </button>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /><span>Loading audit logs...</span></div>
      ) : (
        <div className="card" style={{ overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Details</th>
                <th>IP</th>
                <th>Hash (first 12)</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const style = getActionStyle(log.action);
                return (
                  <tr key={log.id}
                    className={expandedLog === log.id ? 'expanded-row' : ''}
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600, color: 'var(--accent-indigo-light)' }}>#{log.id}</td>
                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td>{log.username || '—'}</td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px',
                        fontSize: '0.7rem', fontWeight: 600,
                        background: style.bg, color: style.color,
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td>{log.resource}</td>
                    <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: expandedLog === log.id ? 'normal' : 'nowrap' }}>
                      {log.details}
                    </td>
                    <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{log.ip_address}</td>
                    <td style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--accent-emerald)' }}>
                      {log.hash?.substring(0, 12)}…
                    </td>
                  </tr>
                );
              })}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No audit logs match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button disabled={filters.page <= 1}
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}>← Prev</button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Page {filters.page} of {pagination.totalPages}
          </span>
          <button disabled={filters.page >= pagination.totalPages}
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}>Next →</button>
        </div>
      )}
    </div>
  );
}

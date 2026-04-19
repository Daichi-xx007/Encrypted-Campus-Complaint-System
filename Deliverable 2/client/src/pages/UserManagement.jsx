import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.users || []);
    } catch (err) {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(userId, newRole) {
    setError(''); setSuccess('');
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      setSuccess('User role updated successfully.');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update role.');
    }
    setConfirmAction(null);
  }

  async function toggleActive(userId, currentActive) {
    setError(''); setSuccess('');
    try {
      await api.put(`/admin/users/${userId}/status`, { is_active: !currentActive });
      setSuccess(`User ${currentActive ? 'deactivated' : 'activated'} successfully.`);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status.');
    }
    setConfirmAction(null);
  }

  async function unlockAccount(userId) {
    setError(''); setSuccess('');
    try {
      await api.put(`/admin/users/${userId}/unlock`);
      setSuccess('Account unlocked successfully.');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to unlock account.');
    }
  }

  // Filter users
  const filtered = users.filter(u => {
    const matchesSearch = !search ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    const matchesStatus = !statusFilter ||
      (statusFilter === 'active' ? u.is_active : !u.is_active);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalActive = users.filter(u => u.is_active).length;
  const totalInactive = users.length - totalActive;
  const byRole = {
    admin: users.filter(u => u.role === 'admin').length,
    staff: users.filter(u => u.role === 'staff').length,
    student: users.filter(u => u.role === 'student').length,
  };

  if (loading) {
    return <div className="loading-container"><div className="spinner" /><span>Loading users...</span></div>;
  }

  return (
    <div className="slide-in">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-white)', marginBottom: '4px' }}>User Management</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Manage user accounts, roles, and access control</p>
      </div>

      {error && <div className="alert alert-error">⚠️ {error}</div>}
      {success && <div className="alert alert-success">✅ {success}</div>}

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon purple">👥</div>
          <div className="stat-info">
            <div className="stat-value">{users.length}</div>
            <div className="stat-label">Total Users</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon emerald">✅</div>
          <div className="stat-info">
            <div className="stat-value">{totalActive}</div>
            <div className="stat-label">Active</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">🚫</div>
          <div className="stat-info">
            <div className="stat-value">{totalInactive}</div>
            <div className="stat-label">Inactive</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">👑</div>
          <div className="stat-info">
            <div className="stat-value">{byRole.admin}</div>
            <div className="stat-label">Admins</div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="filters-bar">
        <input
          type="text"
          className="form-control"
          placeholder="🔍 Search users..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: '280px' }}
        />
        <select className="form-control" value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          <option value="student">Student</option>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
        <select className="form-control" value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          Showing {filtered.length} of {users.length}
        </span>
      </div>

      {/* Users Table */}
      <div className="card" style={{ overflow: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600, color: 'var(--accent-indigo-light)' }}>#{u.id}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: 'var(--gradient-primary)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', fontWeight: 700, color: 'white', flexShrink: 0,
                    }}>
                      {u.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{u.full_name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: '0.8rem' }}>{u.email}</td>
                <td>
                  <select className="form-control" value={u.role}
                    onChange={e => {
                      const newRole = e.target.value;
                      setConfirmAction({ type: 'role', userId: u.id, userName: u.username, newRole });
                    }}
                    style={{ padding: '4px 8px', fontSize: '0.75rem', maxWidth: '120px' }}>
                    <option value="student">Student</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td style={{ fontSize: '0.8rem' }}>{u.department || '—'}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`status-badge ${u.is_active ? 'resolved' : 'closed'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {u.locked_until && new Date(u.locked_until) > new Date() && (
                      <span className="priority-badge critical" title="Account locked">🔒</span>
                    )}
                  </div>
                </td>
                <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`}
                      onClick={() => setConfirmAction({
                        type: 'status', userId: u.id, userName: u.username, currentActive: u.is_active
                      })}>
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    {u.login_attempts >= 5 && (
                      <button className="btn btn-sm btn-secondary" onClick={() => unlockAccount(u.id)}
                        title="Unlock account">🔓 Unlock</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No users match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>
              {confirmAction.type === 'role' ? '🔄 Change User Role' : '⚡ Change User Status'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>
              {confirmAction.type === 'role'
                ? `Are you sure you want to change @${confirmAction.userName}'s role to "${confirmAction.newRole}"?`
                : `Are you sure you want to ${confirmAction.currentActive ? 'deactivate' : 'activate'} @${confirmAction.userName}?`}
            </p>
            {confirmAction.type === 'status' && confirmAction.currentActive && (
              <div className="alert alert-info" style={{ marginTop: '12px' }}>
                ⚠️ Deactivated users will be unable to log in until reactivated.
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmAction(null)}>Cancel</button>
              <button className={`btn ${confirmAction.type === 'status' && confirmAction.currentActive ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => {
                  if (confirmAction.type === 'role') {
                    changeRole(confirmAction.userId, confirmAction.newRole);
                  } else {
                    toggleActive(confirmAction.userId, confirmAction.currentActive);
                  }
                }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

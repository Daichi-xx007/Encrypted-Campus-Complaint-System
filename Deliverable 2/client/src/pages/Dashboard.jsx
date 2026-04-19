import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Dashboard() {
  const { user } = useAuth();
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  // Admin users get redirected to admin dashboard
  if (user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const complaintsRes = await api.get('/complaints?limit=5');
      setRecent(complaintsRes.data.complaints || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="loading-container"><div className="spinner" /><span>Loading dashboard...</span></div>;
  }

  const resolvedCount = recent.filter(c => c.status === 'resolved' || c.status === 'closed').length;
  const pendingCount = recent.filter(c => c.status === 'submitted' || c.status === 'assigned').length;
  const inProgressCount = recent.filter(c => c.status === 'in_progress').length;

  return (
    <div className="slide-in">
      {/* Welcome */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-white)', marginBottom: '4px' }}>
          Welcome back, {user.full_name} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {user.role === 'staff' && 'Your assigned complaints and tasks'}
          {user.role === 'student' && 'Submit and track your complaints securely'}
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon indigo">📊</div>
          <div className="stat-info">
            <div className="stat-value">{recent.length}</div>
            <div className="stat-label">{user.role === 'staff' ? 'Assigned Complaints' : 'Your Complaints'}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon amber">⏳</div>
          <div className="stat-info">
            <div className="stat-value">{pendingCount}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">🔄</div>
          <div className="stat-info">
            <div className="stat-value">{inProgressCount}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon emerald">✅</div>
          <div className="stat-info">
            <div className="stat-value">{resolvedCount}</div>
            <div className="stat-label">Resolved</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Quick Actions</h3>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {user.role === 'student' && (
            <>
              <Link to="/submit-complaint" className="btn btn-primary">📝 Submit Complaint</Link>
              <Link to="/my-complaints" className="btn btn-secondary">📋 View My Complaints</Link>
            </>
          )}
          {user.role === 'staff' && (
            <Link to="/assigned-complaints" className="btn btn-primary">📌 View Assigned</Link>
          )}
        </div>
      </div>

      {/* Recent Complaints */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Complaints</h3>
        </div>
        {recent.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">No complaints yet</div>
            <div className="empty-state-text">
              {user.role === 'student' ? 'Submit your first complaint to get started.' : 'No complaints to display.'}
            </div>
          </div>
        ) : (
          <div className="complaint-list">
            {recent.map(c => (
              <Link to={`/complaints/${c.id}`} className="complaint-card" key={c.id}>
                <span className="complaint-card-id">#{c.id}</span>
                <div className="complaint-card-body">
                  <div className="complaint-card-title">{c.title}</div>
                  <div className="complaint-card-meta">
                    <span>{c.category}</span>
                    <span>•</span>
                    <span>{c.submitter_name}</span>
                    <span>•</span>
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="complaint-card-right">
                  <span className={`priority-badge ${c.priority}`}>{c.priority}</span>
                  <span className={`status-badge ${c.status}`}>{c.status.replace('_', ' ')}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Security info */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="stat-icon emerald" style={{ width: '40px', height: '40px', fontSize: '1rem' }}>🔒</div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>End-to-End Encrypted</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              All complaint data is encrypted with AES-256-GCM. Your information is protected at rest and in transit.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

export default function MyComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ status: '', category: '', page: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplaints();
  }, [filters]);

  async function fetchComplaints() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.category) params.set('category', filters.category);
      params.set('page', filters.page);
      params.set('limit', 20);

      const res = await api.get(`/complaints?${params}`);
      setComplaints(res.data.complaints || []);
      setPagination(res.data.pagination || {});
    } catch (err) {
      console.error('Fetch complaints error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-white)', marginBottom: '4px' }}>
            My Complaints
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {pagination.total || 0} total complaint(s)
          </p>
        </div>
        <Link to="/submit-complaint" className="btn btn-primary">📝 New Complaint</Link>
      </div>

      <div className="filters-bar">
        <select className="form-control" value={filters.status}
          onChange={e => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}>
          <option value="">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select className="form-control" value={filters.category}
          onChange={e => setFilters(prev => ({ ...prev, category: e.target.value, page: 1 }))}>
          <option value="">All Categories</option>
          {['Harassment','Academic Misconduct','Facility Issue','Administrative','Discrimination','Safety Concern','IT / Technical','Other'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /><span>Loading complaints...</span></div>
      ) : complaints.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">No complaints found</div>
            <div className="empty-state-text">Submit your first complaint or adjust the filters.</div>
          </div>
        </div>
      ) : (
        <>
          <div className="complaint-list">
            {complaints.map(c => (
              <Link to={`/complaints/${c.id}`} className="complaint-card" key={c.id}>
                <span className="complaint-card-id">#{c.id}</span>
                <div className="complaint-card-body">
                  <div className="complaint-card-title">{c.title}</div>
                  <div className="complaint-card-meta">
                    <span>{c.category}</span>
                    <span>•</span>
                    <span>{c.is_anonymous ? '🔒 Anonymous' : c.submitter_name}</span>
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

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button disabled={filters.page <= 1}
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}>← Prev</button>
              {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => (
                <button key={i + 1} className={filters.page === i + 1 ? 'active' : ''}
                  onClick={() => setFilters(prev => ({ ...prev, page: i + 1 }))}>{i + 1}</button>
              ))}
              <button disabled={filters.page >= pagination.totalPages}
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function ComplaintDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Status update
  const [newStatus, setNewStatus] = useState('');
  const [resolution, setResolution] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  // Add update
  const [updateContent, setUpdateContent] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  // Assign
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [showAssign, setShowAssign] = useState(false);

  useEffect(() => {
    fetchComplaint();
    if (user.role === 'admin') fetchStaff();
  }, [id]);

  async function fetchComplaint() {
    setLoading(true);
    try {
      const res = await api.get(`/complaints/${id}`);
      setComplaint(res.data.complaint);
      setUpdates(res.data.updates || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load complaint.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchStaff() {
    try {
      const res = await api.get('/admin/staff');
      setStaffList(res.data.staff || []);
    } catch {}
  }

  async function handleStatusUpdate() {
    if (!newStatus) return;
    setStatusLoading(true);
    try {
      await api.put(`/complaints/${id}/status`, {
        status: newStatus,
        resolution: newStatus === 'resolved' ? resolution : undefined,
      });
      await fetchComplaint();
      setNewStatus('');
      setResolution('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status.');
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleAddUpdate() {
    if (!updateContent.trim()) return;
    setUpdateLoading(true);
    try {
      await api.post(`/complaints/${id}/updates`, { content: updateContent });
      setUpdateContent('');
      await fetchComplaint();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add update.');
    } finally {
      setUpdateLoading(false);
    }
  }

  async function handleAssign() {
    if (!selectedStaff) return;
    try {
      await api.put(`/complaints/${id}/assign`, { staff_id: parseInt(selectedStaff) });
      setShowAssign(false);
      await fetchComplaint();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign.');
    }
  }

  if (loading) {
    return <div className="loading-container"><div className="spinner" /><span>Decrypting complaint data...</span></div>;
  }

  if (error && !complaint) {
    return <div className="alert alert-error">⚠️ {error}</div>;
  }

  if (!complaint) return null;

  const canUpdateStatus = user.role === 'admin' || (user.role === 'staff' && complaint.assigned_to === user.id);
  const canAssign = user.role === 'admin';

  return (
    <div className="slide-in">
      {error && <div className="alert alert-error">⚠️ {error}</div>}

      {/* Header */}
      <div className="detail-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>← Back</button>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Complaint #{complaint.id}</span>
          </div>
          <h1>{complaint.title}</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className={`priority-badge ${complaint.priority}`}>{complaint.priority}</span>
          <span className={`status-badge ${complaint.status}`}>{complaint.status.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Meta */}
      <div className="detail-meta">
        <div className="detail-meta-item">
          <div className="detail-meta-label">Submitted By</div>
          <div className="detail-meta-value">{complaint.is_anonymous ? '🔒 Anonymous' : complaint.submitter_name}</div>
        </div>
        <div className="detail-meta-item">
          <div className="detail-meta-label">Category</div>
          <div className="detail-meta-value">{complaint.category}</div>
        </div>
        <div className="detail-meta-item">
          <div className="detail-meta-label">Assigned To</div>
          <div className="detail-meta-value">
            {complaint.assigned_name}
            {canAssign && (
              <button className="btn btn-sm btn-secondary" style={{ marginLeft: '8px' }}
                onClick={() => setShowAssign(!showAssign)}>
                {complaint.assigned_to ? 'Reassign' : 'Assign'}
              </button>
            )}
          </div>
        </div>
        <div className="detail-meta-item">
          <div className="detail-meta-label">Created</div>
          <div className="detail-meta-value">{new Date(complaint.created_at).toLocaleString()}</div>
        </div>
      </div>

      {/* Assign Modal */}
      {showAssign && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 className="card-title" style={{ marginBottom: '12px' }}>Assign to Staff</h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select className="form-control" value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}
              style={{ maxWidth: '300px' }}>
              <option value="">Select staff member...</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.full_name} ({s.department})</option>
              ))}
            </select>
            <button className="btn btn-primary btn-sm" onClick={handleAssign} disabled={!selectedStaff}>Assign</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAssign(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Description */}
      <div className="detail-section">
        <h3>🔓 Decrypted Description</h3>
        <div className="detail-description">{complaint.description}</div>
      </div>

      {/* Resolution */}
      {complaint.resolution && (
        <div className="detail-section">
          <h3>✅ Resolution</h3>
          <div className="detail-description">{complaint.resolution}</div>
        </div>
      )}

      {/* Status Update (staff/admin) */}
      {canUpdateStatus && complaint.status !== 'closed' && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 className="card-title" style={{ marginBottom: '12px' }}>Update Status</h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <select className="form-control" value={newStatus} onChange={e => setNewStatus(e.target.value)}
              style={{ maxWidth: '200px' }}>
              <option value="">Select status...</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            {newStatus === 'resolved' && (
              <textarea className="form-control" placeholder="Resolution details (encrypted)"
                value={resolution} onChange={e => setResolution(e.target.value)}
                style={{ flex: 1, minHeight: '80px' }} />
            )}
            <button className="btn btn-primary btn-sm" onClick={handleStatusUpdate}
              disabled={!newStatus || statusLoading}>
              {statusLoading ? 'Updating...' : 'Update'}
            </button>
          </div>
        </div>
      )}

      {/* Updates Timeline */}
      <div className="detail-section">
        <h3>📋 Updates & Notes</h3>
        {updates.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No updates yet.</p>
        ) : (
          <div className="timeline">
            {updates.map(u => (
              <div className="timeline-item" key={u.id}>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <span className="timeline-author">
                      {u.author_name}
                      <span className={`role-badge ${u.author_role}`} style={{ marginLeft: '8px' }}>{u.author_role}</span>
                    </span>
                    <span className="timeline-date">{new Date(u.created_at).toLocaleString()}</span>
                  </div>
                  <div className="timeline-text">{u.content}</div>
                  {u.status_change && (
                    <div style={{ marginTop: '8px' }}>
                      <span className={`status-badge ${u.status_change}`}>→ {u.status_change.replace('_', ' ')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Update */}
      {complaint.status !== 'closed' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '12px' }}>Add Note</h3>
          <textarea className="form-control" placeholder="Add an encrypted note or update..."
            value={updateContent} onChange={e => setUpdateContent(e.target.value)}
            style={{ marginBottom: '12px' }} />
          <button className="btn btn-primary btn-sm" onClick={handleAddUpdate}
            disabled={!updateContent.trim() || updateLoading}>
            {updateLoading ? 'Encrypting...' : '📝 Add Note'}
          </button>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function SubmitComplaint() {
  const [form, setForm] = useState({
    title: '', description: '', category: '', priority: 'medium', is_anonymous: false,
  });
  const [categories, setCategories] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/complaints/meta/options').then(res => {
      setCategories(res.data.categories || []);
      setPriorities(res.data.priorities || []);
    }).catch(() => {});
  }, []);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await api.post('/complaints', form);
      setSuccess(`Complaint #${res.data.complaintId} submitted successfully! Redirecting...`);
      setTimeout(() => navigate('/my-complaints'), 2000);
    } catch (err) {
      const details = err.response?.data?.details;
      if (details) {
        setError(details.map(d => d.message).join('. '));
      } else {
        setError(err.response?.data?.error || 'Failed to submit complaint.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="slide-in" style={{ maxWidth: '720px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-white)', marginBottom: '4px' }}>
          Submit a Complaint
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Your complaint data will be encrypted with AES-256-GCM before storage.
        </p>
      </div>

      {error && <div className="alert alert-error">⚠️ {error}</div>}
      {success && <div className="alert alert-success">✅ {success}</div>}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Complaint Title</label>
            <input
              id="title" name="title" className="form-control"
              placeholder="Brief summary of your complaint"
              value={form.title} onChange={handleChange} required
              minLength={5} maxLength={200}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select id="category" name="category" className="form-control"
                value={form.category} onChange={handleChange} required>
                <option value="">Select category...</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select id="priority" name="priority" className="form-control"
                value={form.priority} onChange={handleChange}>
                {priorities.map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description" name="description" className="form-control"
              placeholder="Provide detailed information about your complaint. All content is encrypted."
              value={form.description} onChange={handleChange} required
              minLength={10} maxLength={5000}
              style={{ minHeight: '180px' }}
            />
          </div>

          <div className="checkbox-group">
            <input
              type="checkbox" id="is_anonymous" name="is_anonymous"
              checked={form.is_anonymous} onChange={handleChange}
            />
            <label htmlFor="is_anonymous">
              Submit anonymously — your identity will not be associated with this complaint
            </label>
          </div>

          {form.is_anonymous && (
            <div className="alert alert-info" style={{ marginBottom: '20px' }}>
              🔒 Anonymous submission: Your identity will be completely disassociated from this complaint.
              You won't receive status notifications but can still track via complaint ID.
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? 'Encrypting & Submitting...' : '🔐 Submit Complaint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

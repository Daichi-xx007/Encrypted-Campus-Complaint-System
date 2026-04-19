import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({
    username: '', email: '', password: '', confirmPassword: '',
    full_name: '', department: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match.');
    }

    setLoading(true);
    try {
      await register(form);
      navigate('/login');
    } catch (err) {
      const details = err.response?.data?.details;
      if (details) {
        setError(details.map(d => d.message).join('. '));
      } else {
        setError(err.response?.data?.error || 'Registration failed.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '500px' }}>
        <div className="logo">
          <div className="logo-icon">🛡️</div>
          <span className="logo-text">ESCMS</span>
        </div>
        <h1>Create Account</h1>
        <p className="subtitle">Register to submit and track complaints securely</p>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="full_name">Full Name</label>
              <input id="full_name" name="full_name" className="form-control" placeholder="John Doe"
                value={form.full_name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input id="username" name="username" className="form-control" placeholder="johndoe"
                value={form.username} onChange={handleChange} required autoComplete="username" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" className="form-control" placeholder="john@institution.edu"
                value={form.email} onChange={handleChange} required autoComplete="email" />
            </div>
            <div className="form-group">
              <label htmlFor="department">Department</label>
              <input id="department" name="department" className="form-control" placeholder="Computer Science"
                value={form.department} onChange={handleChange} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" className="form-control" placeholder="Min 8 chars, mixed case"
                value={form.password} onChange={handleChange} required autoComplete="new-password" />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" className="form-control" placeholder="Repeat password"
                value={form.confirmPassword} onChange={handleChange} required autoComplete="new-password" />
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Password must contain: 8+ characters, uppercase, lowercase, number, special character
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? 'Creating account...' : '🚀 Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

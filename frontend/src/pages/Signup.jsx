import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signup(form);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h2>Sign up</h2>
        <div className="form-row">
          <label htmlFor="full_name">Full name</label>
          <input id="full_name" value={form.full_name} onChange={update('full_name')} required />
        </div>
        <div className="form-row">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={form.email} onChange={update('email')} required />
        </div>
        <div className="form-row">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={form.password} onChange={update('password')} required />
        </div>
        <div className="form-row">
          <label htmlFor="phone">Phone</label>
          <input id="phone" value={form.phone} onChange={update('phone')} />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" disabled={submitting} style={{ width: '100%' }}>
          {submitting ? 'Creating account…' : 'Sign up'}
        </button>
        <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
          Self-signup creates a student account. Mentor, teacher and admin accounts are created by an administrator.
        </p>
        <p style={{ marginTop: 16, fontSize: 13 }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}

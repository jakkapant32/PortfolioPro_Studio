import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PasswordInput from '../../components/PasswordInput';
import { fetchMe } from '../../api/auth';

export default function AdminLogin() {
  const { user, loading, isAuthenticated, login, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated && user?.role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [loading, isAuthenticated, user, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const session = await login(form.email, form.password);
      const me = await fetchMe(session.token);
      if (me?.role !== 'admin') {
        logout();
        setError('บัญชีนี้ไม่มีสิทธิ์ Admin — ใช้บัญชีที่ได้รับอนุญาตเท่านั้น');
        return;
      }
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-login-page">
        <div className="admin-loading">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <div className="admin-login-icon">🔐</div>
          <h1>Admin Panel</h1>
          <p>PortfolioPro Studio — เข้าสู่ระบบหลังบ้าน</p>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="admin-email">อีเมล Admin</label>
            <input
              type="email"
              id="admin-email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="username"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="admin-password">รหัสผ่าน</label>
            <PasswordInput
              id="admin-password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn-primary admin-login-submit" disabled={submitting}>
            {submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ Admin'}
          </button>
        </form>

        <p className="admin-login-footer">
          <Link to="/">← กลับหน้าเว็บลูกค้า</Link>
        </p>
      </div>
    </div>
  );
}

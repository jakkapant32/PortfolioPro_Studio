import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PasswordInput from './PasswordInput';
import { fetchMe } from '../api/auth';

export default function AdminLoginModal() {
  const {
    adminLoginModalOpen, closeAdminLoginModal, onAdminLoginSuccess,
    login, logout,
  } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!adminLoginModalOpen) {
      setForm({ email: '', password: '' });
      setError('');
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [adminLoginModalOpen]);

  if (!adminLoginModalOpen) return null;

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
      onAdminLoginSuccess();
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="auth-modal-overlay" onClick={closeAdminLoginModal} />
      <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="admin-auth-title">
        <button type="button" className="auth-modal-close" onClick={closeAdminLoginModal} aria-label="ปิด">&times;</button>

        <div className="auth-modal-header">
          <div className="auth-modal-icon">
            <svg><use href="#icon-settings" /></svg>
          </div>
          <h2 id="admin-auth-title">Admin Panel</h2>
          <p>เข้าสู่ระบบหลังบ้าน PortfolioPro Studio</p>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="admin-modal-email">อีเมล Admin</label>
            <input
              type="email"
              id="admin-modal-email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="username"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="admin-modal-password">รหัสผ่าน</label>
            <PasswordInput
              id="admin-modal-password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn-primary auth-submit" disabled={submitting}>
            {submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ Admin'}
          </button>
        </form>
      </div>
    </>
  );
}

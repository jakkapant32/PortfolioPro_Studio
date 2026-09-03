import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import PasswordInput from './PasswordInput';
import { validatePassword } from '../utils/password';

export default function LoginModal() {
  const {
    loginModalOpen, loginMessage, closeLoginModal, onLoginSuccess,
    login, register,
  } = useAuth();

  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!loginModalOpen) {
      setMode('login');
      setForm({ name: '', email: '', password: '', confirm: '' });
      setError('');
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [loginModalOpen]);

  if (!loginModalOpen) return null;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'register') {
        const pwdErr = validatePassword(form.password);
        if (pwdErr) throw new Error(pwdErr);
        if (form.password !== form.confirm) throw new Error('รหัสผ่านไม่ตรงกัน');
        await register(form.name, form.email, form.password);
      } else {
        await login(form.email, form.password);
      }
      onLoginSuccess();
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="auth-modal-overlay" onClick={closeLoginModal} />
      <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <button type="button" className="auth-modal-close" onClick={closeLoginModal} aria-label="ปิด">&times;</button>

        <div className="auth-modal-header">
          <div className="auth-modal-icon">
            <svg><use href="#icon-user" /></svg>
          </div>
          <h2 id="auth-modal-title">{mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</h2>
          <p>{loginMessage || 'เข้าสู่ระบบเพื่อสั่งซื้อบริการและขอใบเสนอราคา'}</p>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="modal-name">ชื่อ-นามสกุล</label>
              <input type="text" id="modal-name" name="name" value={form.name} onChange={handleChange} required />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="modal-email">อีเมล</label>
            <input type="email" id="modal-email" name="email" value={form.email} onChange={handleChange} required autoFocus />
          </div>
          <div className="form-group">
            <label htmlFor="modal-password">รหัสผ่าน</label>
            <PasswordInput
              id="modal-password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="modal-confirm">ยืนยันรหัสผ่าน</label>
              <PasswordInput
                id="modal-confirm"
                name="confirm"
                value={form.confirm}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
            </div>
          )}
          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? 'กำลังดำเนินการ...' : mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? (
            <>ยังไม่มีบัญชี? <button type="button" onClick={() => { setMode('register'); setError(''); }}>สมัครสมาชิก</button></>
          ) : (
            <>มีบัญชีแล้ว? <button type="button" onClick={() => { setMode('login'); setError(''); }}>เข้าสู่ระบบ</button></>
          )}
        </p>
      </div>
    </>
  );
}

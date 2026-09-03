import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import PasswordInput from './PasswordInput';
import { validatePassword } from '../utils/password';

const EMPTY = {
  name: '',
  email: '',
  current_password: '',
  password: '',
  confirm: '',
};

export default function ProfileModal() {
  const { profileModalOpen, closeProfileModal, user, updateProfile } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profileModalOpen) {
      setForm(EMPTY);
      setError('');
      document.body.style.overflow = '';
      return;
    }
    setForm({
      name: user?.name || '',
      email: user?.email || '',
      current_password: '',
      password: '',
      confirm: '',
    });
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [profileModalOpen, user?.name, user?.email]);

  if (!profileModalOpen) return null;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
      };

      const emailChanged = payload.email.toLowerCase() !== (user?.email || '').toLowerCase();
      const passwordChange = Boolean(form.password);

      if (passwordChange) {
        const pwdErr = validatePassword(form.password);
        if (pwdErr) throw new Error(pwdErr);
        if (form.password !== form.confirm) throw new Error('รหัสผ่านใหม่ไม่ตรงกัน');
        payload.password = form.password;
      }

      if (emailChanged || passwordChange) {
        if (!form.current_password) {
          throw new Error('กรุณากรอกรหัสผ่านปัจจุบันเพื่อยืนยันการเปลี่ยนอีเมลหรือรหัสผ่าน');
        }
        payload.current_password = form.current_password;
      }

      await updateProfile(payload);
      closeProfileModal();
    } catch (err) {
      setError(err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="auth-modal-overlay" onClick={closeProfileModal} />
      <div className="auth-modal auth-modal-wide" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
        <button type="button" className="auth-modal-close" onClick={closeProfileModal} aria-label="ปิด">&times;</button>

        <div className="auth-modal-header">
          <div className="auth-modal-icon">
            <svg><use href="#icon-user" /></svg>
          </div>
          <h2 id="profile-modal-title">แก้ไขโปรไฟล์</h2>
          <p>แก้ไขข้อมูลบัญชีของคุณ</p>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <p className="profile-section-label">ข้อมูลบัญชี</p>
          <div className="form-group">
            <label htmlFor="profile-name">ชื่อ-นามสกุล</label>
            <input
              type="text"
              id="profile-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-email">อีเมล</label>
            <input
              type="email"
              id="profile-email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <p className="profile-section-label">เปลี่ยนรหัสผ่าน <span>(ไม่บังคับ)</span></p>
          <div className="form-group">
            <label htmlFor="profile-current">รหัสผ่านปัจจุบัน</label>
            <PasswordInput
              id="profile-current"
              name="current_password"
              value={form.current_password}
              onChange={handleChange}
              autoComplete="current-password"
            />
            <small className="form-hint">จำเป็นถ้าเปลี่ยนอีเมลหรือรหัสผ่าน</small>
          </div>
          <div className="form-group">
            <label htmlFor="profile-password">รหัสผ่านใหม่</label>
            <PasswordInput
              id="profile-password"
              name="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-confirm">ยืนยันรหัสผ่านใหม่</label>
            <PasswordInput
              id="profile-confirm"
              name="confirm"
              value={form.confirm}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
          </button>
        </form>
      </div>
    </>
  );
}

import { useEffect, useState } from 'react';
import { useRequireAdmin } from '../../hooks/useRequireAdmin';
import { getAdminSiteConfig, updateSiteConfig } from '../../api/admin';
import { siteConfig as fallback } from '../../config/site';

export default function AdminSettings() {
  const { token, loading: authLoading } = useRequireAdmin();
  const [form, setForm] = useState({ ...fallback, social: { ...fallback.social } });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!token) return;
    getAdminSiteConfig(token)
      .then((data) => {
        setForm({
          ...fallback,
          ...data,
          social: { ...fallback.social, ...(data.social || {}) },
        });
        setLoaded(true);
      })
      .catch((err) => {
        setError(err.message);
        setLoaded(true);
      });
  }, [token]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setSocial = (key, value) => setForm((prev) => ({ ...prev, social: { ...prev.social, [key]: value } }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateSiteConfig(token, form);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !loaded) return <div className="admin-loading">กำลังโหลด...</div>;

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <h1>ตั้งค่าเว็บ</h1>
        <p>ข้อมูลติดต่อ บัญชีโอนเงิน และ PromptPay ที่แสดงตอนชำระเงิน</p>
      </header>

      {error && <div className="form-error">{error}</div>}

      <div className="admin-modal" style={{ position: 'static', maxWidth: '640px', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
        <div className="admin-form-row">
          <label>ชื่อเว็บ</label>
          <input value={form.name || ''} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="admin-form-row">
          <label>Tagline</label>
          <input value={form.tagline || ''} onChange={(e) => set('tagline', e.target.value)} />
        </div>
        <div className="admin-detail-grid">
          <div className="admin-form-row">
            <label>อีเมล</label>
            <input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div className="admin-form-row">
            <label>เบอร์โทร (แสดง)</label>
            <input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div className="admin-form-row">
            <label>เบอร์โทร (tel: / PromptPay)</label>
            <input value={form.phoneTel || ''} onChange={(e) => set('phoneTel', e.target.value)} />
          </div>
          <div className="admin-form-row">
            <label>PromptPay</label>
            <input value={form.promptPayPhone || ''} onChange={(e) => set('promptPayPhone', e.target.value)} />
          </div>
          <div className="admin-form-row">
            <label>ธนาคาร / ช่องทางโอน</label>
            <input value={form.bankName || ''} onChange={(e) => set('bankName', e.target.value)} />
          </div>
          <div className="admin-form-row">
            <label>ชื่อบัญชี</label>
            <input value={form.bankAccountName || ''} onChange={(e) => set('bankAccountName', e.target.value)} />
          </div>
          <div className="admin-form-row">
            <label>เลขบัญชี / พร้อมเพย์</label>
            <input value={form.bankAccountNumber || ''} onChange={(e) => set('bankAccountNumber', e.target.value)} />
          </div>
          <div className="admin-form-row">
            <label>Line ID</label>
            <input value={form.lineId || ''} onChange={(e) => set('lineId', e.target.value)} />
          </div>
          <div className="admin-form-row">
            <label>Line URL</label>
            <input value={form.lineUrl || ''} onChange={(e) => set('lineUrl', e.target.value)} />
          </div>
        </div>
        <div className="admin-form-row">
          <label>เวลาติดต่อ</label>
          <input value={form.phoneHours || ''} onChange={(e) => set('phoneHours', e.target.value)} />
        </div>
        <div className="admin-form-row">
          <label>Facebook</label>
          <input value={form.social?.facebook || ''} onChange={(e) => setSocial('facebook', e.target.value)} />
        </div>
        <div className="admin-form-row">
          <label>Instagram</label>
          <input value={form.social?.instagram || ''} onChange={(e) => setSocial('instagram', e.target.value)} />
        </div>
        <button type="button" className="btn-primary" onClick={save} disabled={saving}>
          {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
        </button>
      </div>
    </div>
  );
}

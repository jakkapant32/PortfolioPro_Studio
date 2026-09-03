import { useEffect, useMemo, useState } from 'react';
import { useRequireAdmin, formatDate } from '../../hooks/useRequireAdmin';
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from '../../api/admin';
import AdminSearchInput from '../../components/admin/AdminSearchInput';
import { filterBySearch } from '../../utils/adminSearch';

const EMPTY = {
  code: '',
  type: 'percent',
  value: 10,
  min_purchase: 0,
  max_uses: 0,
  expires_at: '',
  active: true,
};

function toForm(item) {
  if (!item) return { ...EMPTY };
  return {
    code: item.code || '',
    type: item.type || 'percent',
    value: item.value ?? 10,
    min_purchase: item.min_purchase ?? 0,
    max_uses: item.max_uses ?? 0,
    expires_at: item.expires_at ? item.expires_at.slice(0, 10) : '',
    active: item.active !== false,
  };
}

export default function AdminCoupons() {
  const { token, loading: authLoading } = useRequireAdmin();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => {
    if (!token) return;
    getCoupons(token)
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err.message));
  };

  useEffect(load, [token]);

  const filteredItems = useMemo(
    () => filterBySearch(items, search, ['code', 'type', 'value', 'min_purchase']),
    [items, search],
  );

  const openNew = () => {
    setEditing('new');
    setForm({ ...EMPTY });
    setError(null);
  };

  const openEdit = (row) => {
    setEditing(row.id);
    setForm(toForm(row));
    setError(null);
  };

  const close = () => {
    setEditing(null);
    setForm(EMPTY);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        code: form.code,
        type: form.type,
        value: Number(form.value),
        min_purchase: Number(form.min_purchase) || 0,
        max_uses: Number(form.max_uses) || 0,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        active: form.active,
      };
      if (editing === 'new') {
        await createCoupon(token, payload);
      } else {
        await updateCoupon(token, editing, payload);
      }
      close();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('ลบคูปองนี้?')) return;
    try {
      await deleteCoupon(token, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (authLoading) return <div className="admin-loading">กำลังโหลด...</div>;

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <h1>คูปองส่วนลด</h1>
        <p>สร้างและจัดการโค้ดส่วนลดสำหรับลูกค้า</p>
      </header>

      <div className="admin-toolbar">
        <AdminSearchInput value={search} onChange={setSearch} placeholder="ค้นหาโค้ดคูปอง..." />
        <button type="button" className="btn-primary" onClick={openNew}>+ สร้างคูปอง</button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>โค้ด</th>
              <th>ประเภท</th>
              <th>มูลค่า</th>
              <th>ยอดขั้นต่ำ</th>
              <th>ใช้แล้ว</th>
              <th>หมดอายุ</th>
              <th>สถานะ</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr><td colSpan={8} className="admin-empty">{search ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีคูปอง'}</td></tr>
            ) : filteredItems.map((row) => (
              <tr key={row.id}>
                <td><strong>{row.code}</strong></td>
                <td>{row.type === 'percent' ? 'เปอร์เซ็นต์' : 'ลดบาท'}</td>
                <td>{row.type === 'percent' ? `${row.value}%` : `฿${Number(row.value).toLocaleString()}`}</td>
                <td>{row.min_purchase > 0 ? `฿${Number(row.min_purchase).toLocaleString()}` : '-'}</td>
                <td>{row.used_count}{row.max_uses > 0 ? ` / ${row.max_uses}` : ''}</td>
                <td>{row.expires_at ? formatDate(row.expires_at) : '-'}</td>
                <td>{row.active ? 'เปิด' : 'ปิด'}</td>
                <td className="admin-actions">
                  <button type="button" className="admin-btn-secondary" onClick={() => openEdit(row)}>แก้ไข</button>
                  <button type="button" className="admin-btn-danger" onClick={() => remove(row.id)}>ลบ</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="admin-modal-overlay" onClick={close}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing === 'new' ? 'สร้างคูปอง' : 'แก้ไขคูปอง'}</h2>
            <div className="form-group">
              <label>โค้ด</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SAVE10" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>ประเภท</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="percent">เปอร์เซ็นต์ (%)</option>
                  <option value="fixed">ลดเป็นบาท (฿)</option>
                </select>
              </div>
              <div className="form-group">
                <label>มูลค่า</label>
                <input type="number" min="1" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>ยอดขั้นต่ำ (฿)</label>
                <input type="number" min="0" value={form.min_purchase} onChange={(e) => setForm({ ...form, min_purchase: e.target.value })} />
              </div>
              <div className="form-group">
                <label>จำกัดจำนวนครั้ง (0 = ไม่จำกัด)</label>
                <input type="number" min="0" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>วันหมดอายุ (ไม่บังคับ)</label>
              <input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </div>
            <label className="admin-checkbox">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              เปิดใช้งาน
            </label>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn-secondary" onClick={close}>ยกเลิก</button>
              <button type="button" className="btn-primary" onClick={save} disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

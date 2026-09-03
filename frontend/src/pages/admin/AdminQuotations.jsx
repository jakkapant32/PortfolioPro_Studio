import { useEffect, useMemo, useState } from 'react';
import { useRequireAdmin, ADMIN_STATUS_LABELS, formatDate, parseItems } from '../../hooks/useRequireAdmin';
import { getQuotations, updateQuotation, deleteQuotation } from '../../api/admin';
import AdminSearchInput from '../../components/admin/AdminSearchInput';
import { filterBySearch } from '../../utils/adminSearch';

export default function AdminQuotations() {
  const { token, loading: authLoading } = useRequireAdmin();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ admin_status: 'new', admin_note: '' });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!token) return;
    const params = statusFilter ? { status: statusFilter } : {};
    getQuotations(token, params)
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err.message));
  };

  useEffect(load, [token, statusFilter]);

  const filteredItems = useMemo(
    () => filterBySearch(items, search, [
      'id', 'name', 'email', 'phone', 'source', 'total', 'message', 'admin_status',
      (row) => ADMIN_STATUS_LABELS[row.admin_status],
    ]),
    [items, search],
  );

  const openDetail = (row) => {
    setSelected(row);
    setForm({ admin_status: row.admin_status || 'new', admin_note: row.admin_note || '' });
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateQuotation(token, selected.id, form);
      setSelected(updated);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selected || !window.confirm('ลบใบเสนอราคานี้?')) return;
    setSaving(true);
    try {
      await deleteQuotation(token, selected.id);
      setSelected(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <div className="admin-loading">กำลังโหลด...</div>;

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <h1>ใบเสนอราคา</h1>
        <p>คำขอจากตะกร้าสินค้า (ลูกค้าที่ login แล้ว)</p>
      </header>

      <div className="admin-toolbar">
        <AdminSearchInput
          value={search}
          onChange={setSearch}
          placeholder="ค้นหาชื่อ, อีเมล, #ใบเสนอราคา..."
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">ทุกสถานะ</option>
          {Object.entries(ADMIN_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>ลูกค้า</th>
              <th>ยอด</th>
              <th>แหล่ง</th>
              <th>สถานะ</th>
              <th>วันที่</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr><td colSpan={6} className="admin-empty">{search ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีใบเสนอราคา'}</td></tr>
            ) : filteredItems.map((row) => (
              <tr key={row.id} className="admin-row-click" onClick={() => openDetail(row)}>
                <td>{row.id}</td>
                <td>
                  <div>{row.name}</div>
                  <small>{row.email}</small>
                </td>
                <td>฿{Number(row.total).toLocaleString()}</td>
                <td>{row.source || '-'}</td>
                <td><span className={`admin-badge admin-${row.admin_status || 'new'}`}>{ADMIN_STATUS_LABELS[row.admin_status] || 'ใหม่'}</span></td>
                <td>{formatDate(row.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="admin-modal-overlay" onClick={() => setSelected(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="admin-modal-close" onClick={() => setSelected(null)}>&times;</button>
            <h2>ใบเสนอราคา #{selected.id}</h2>
            <div className="admin-detail-grid">
              <div><strong>ชื่อ</strong><p>{selected.name}</p></div>
              <div><strong>อีเมล</strong><p>{selected.email}</p></div>
              <div><strong>โทร</strong><p>{selected.phone || '-'}</p></div>
              <div><strong>ยอดรวม</strong><p>฿{Number(selected.total).toLocaleString()}</p></div>
            </div>
            <p><strong>ข้อความ</strong></p>
            <p className="admin-message">{selected.message || '-'}</p>
            <ul className="admin-item-list">
              {parseItems(selected.items).map((item, i) => (
                <li key={i}>{item.title} — ฿{Number(item.price).toLocaleString()}</li>
              ))}
            </ul>
            <div className="admin-form-row">
              <label>สถานะ</label>
              <select value={form.admin_status} onChange={(e) => setForm({ ...form, admin_status: e.target.value })}>
                {Object.entries(ADMIN_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="admin-form-row">
              <label>บันทึก</label>
              <textarea rows={3} value={form.admin_note} onChange={(e) => setForm({ ...form, admin_note: e.target.value })} />
            </div>
            <div className="admin-form-actions">
              <button type="button" className="btn-primary" onClick={save} disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
              <button type="button" className="admin-btn-danger" onClick={remove} disabled={saving}>ลบ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

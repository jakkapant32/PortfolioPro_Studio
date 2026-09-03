import { useEffect, useMemo, useState } from 'react';
import { useRequireAdmin, ORDER_STATUS_LABELS, formatDate, parseItems } from '../../hooks/useRequireAdmin';
import { getOrders, getOrder, updateOrder, deleteOrder, createProjectFromOrder, confirmOrderPayment, rejectOrderPayment } from '../../api/admin';
import { fetchAdminPaymentSlip } from '../../api/payment';
import AdminSearchInput from '../../components/admin/AdminSearchInput';
import { filterBySearch } from '../../utils/adminSearch';

const EMPTY_FORM = {
  customer_name: '',
  customer_email: '',
  payment_method: '',
  total: '',
  status: 'pending',
};

export default function AdminOrders() {
  const { token, loading: authLoading } = useRequireAdmin();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [slipUrl, setSlipUrl] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = () => {
    if (!token) return;
    const params = statusFilter ? { status: statusFilter } : {};
    getOrders(token, params)
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err.message));
  };

  useEffect(load, [token, statusFilter]);

  const filteredItems = useMemo(
    () => filterBySearch(items, search, [
      'id', 'customer_name', 'customer_email', 'payment_method', 'status', 'total',
      (row) => ORDER_STATUS_LABELS[row.status],
    ]),
    [items, search],
  );

  const openDetail = async (id) => {
    try {
      const data = await getOrder(token, id);
      setSelected(data);
      setRejectReason('');
      setForm({
        customer_name: data.order.customer_name || '',
        customer_email: data.order.customer_email || '',
        payment_method: data.order.payment_method || '',
        total: String(data.order.total ?? ''),
        status: data.order.status || 'pending',
      });
      setError(null);
      if (slipUrl) URL.revokeObjectURL(slipUrl);
      setSlipUrl(null);
      if (data.has_slip || data.order?.slip_filename) {
        try {
          const url = await fetchAdminPaymentSlip(id, token);
          setSlipUrl(url);
        } catch {
          setSlipUrl(null);
        }
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await updateOrder(token, selected.order.id, {
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        payment_method: form.payment_method,
        total: Number(form.total),
        status: form.status,
      });
      const data = await getOrder(token, selected.order.id);
      setSelected(data);
      setForm({
        customer_name: data.order.customer_name || '',
        customer_email: data.order.customer_email || '',
        payment_method: data.order.payment_method || '',
        total: String(data.order.total ?? ''),
        status: data.order.status || 'pending',
      });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selected) return;
    if (!window.confirm(`ยืนยันว่าได้รับเงินสำหรับคำสั่งซื้อ #${selected.order.id}?`)) return;
    setSaving(true);
    setError(null);
    try {
      await confirmOrderPayment(token, selected.order.id);
      await openDetail(selected.order.id);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await rejectOrderPayment(token, selected.order.id, rejectReason);
      await openDetail(selected.order.id);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateProject = async () => {
    if (!selected || (selected.order.status !== 'successful' && selected.order.status !== 'deposit_paid')) return;
    setCreatingProject(true);
    setError(null);
    try {
      await createProjectFromOrder(token, selected.order.id);
      alert('สร้างโปรเจกตแล้ว — ไปจัดการที่เมนู โปรเจกต/ส่งมอบ');
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingProject(false);
    }
  };

  const remove = async () => {
    if (!selected || !window.confirm(`ลบคำสั่งซื้อ #${selected.order.id}?`)) return;
    setSaving(true);
    setError(null);
    try {
      await deleteOrder(token, selected.order.id);
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
        <h1>คำสั่งซื้อ</h1>
        <p>ดูสลิปโอนเงิน ยืนยันหรือปฏิเสธคำสั่งซื้อ</p>
      </header>

      <div className="admin-toolbar">
        <AdminSearchInput
          value={search}
          onChange={setSearch}
          placeholder="ค้นหาชื่อ, อีเมล, #ออเดอร์..."
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">ทุกสถานะ</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {error && !selected && <div className="form-error">{error}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>ลูกค้า</th>
              <th>ยอด</th>
              <th>ช่องทาง</th>
              <th>สถานะ</th>
              <th>วันที่</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr><td colSpan={7} className="admin-empty">{search ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีคำสั่งซื้อ'}</td></tr>
            ) : filteredItems.map((row) => (
              <tr key={row.id}>
                <td className="admin-row-click" onClick={() => openDetail(row.id)}>{row.id}</td>
                <td className="admin-row-click" onClick={() => openDetail(row.id)}>
                  <div>{row.customer_name}</div>
                  <small>{row.customer_email}</small>
                </td>
                <td className="admin-row-click" onClick={() => openDetail(row.id)}>฿{Number(row.total).toLocaleString()}</td>
                <td className="admin-row-click" onClick={() => openDetail(row.id)}>{row.payment_method}</td>
                <td className="admin-row-click" onClick={() => openDetail(row.id)}>
                  <span className={`admin-badge status-${row.status}`}>{ORDER_STATUS_LABELS[row.status] || row.status}</span>
                </td>
                <td className="admin-row-click" onClick={() => openDetail(row.id)}>{formatDate(row.created_at)}</td>
                <td className="admin-actions">
                  <button
                    type="button"
                    className={row.status === 'slip_submitted' ? 'btn-primary' : 'admin-btn-secondary'}
                    onClick={() => openDetail(row.id)}
                  >
                    {row.status === 'slip_submitted' ? 'ดูสลิป' : 'เปิด'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="admin-modal-overlay" onClick={() => setSelected(null)}>
          <div className="admin-modal admin-modal-wide" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="admin-modal-close" onClick={() => setSelected(null)}>&times;</button>
            <h2>
              {selected.order.status === 'slip_submitted'
                ? `ตรวจสลิปคำสั่งซื้อ #${selected.order.id}`
                : `คำสั่งซื้อ #${selected.order.id}`}
            </h2>
            {error && <div className="form-error">{error}</div>}

            {slipUrl && (
              <div className="admin-slip-wrap">
                <h3>สลิปโอนเงิน</h3>
                <a href={slipUrl} target="_blank" rel="noreferrer">
                  <img src={slipUrl} alt="สลิปโอนเงิน" className="admin-slip-image" />
                </a>
              </div>
            )}

            {selected.order.status === 'slip_submitted' && (
              <div className="admin-slip-actions">
                <p className="form-hint">ตรวจยอดและชื่อบัญชีในสลิปให้ตรง แล้วกดยืนยัน หรือปฏิเสธให้ลูกค้าแนบใหม่</p>
                <textarea
                  rows={2}
                  placeholder="เหตุผลถ้าปฏิเสธ (ไม่บังคับ)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <div className="admin-modal-actions" style={{ marginTop: 8 }}>
                  <button type="button" className="admin-btn-danger" onClick={handleRejectPayment} disabled={saving}>
                    ปฏิเสธสลิป
                  </button>
                  <button type="button" className="btn-primary" onClick={handleConfirmPayment} disabled={saving}>
                    {saving ? 'กำลังบันทึก...' : 'ยืนยันการสั่งซื้อ'}
                  </button>
                </div>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>ชื่อลูกค้า</label>
                <input
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>อีเมล</label>
                <input
                  type="email"
                  value={form.customer_email}
                  onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>ยอดชำระ (฿)</label>
                <input
                  type="number"
                  min="1"
                  value={form.total}
                  onChange={(e) => setForm({ ...form, total: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>ช่องทางชำระ</label>
                <input
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>สถานะ</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div className="admin-detail-grid" style={{ marginTop: 12 }}>
              <div><strong>ชำระเมื่อ</strong><p>{formatDate(selected.order.paid_at)}</p></div>
              {selected.order.coupon_code && (
                <div><strong>คูปอง</strong><p>{selected.order.coupon_code} (-฿{Number(selected.order.discount_amount || 0).toLocaleString()})</p></div>
              )}
              <div><strong>แนบสลิป</strong><p>{selected.order.slip_uploaded_at ? formatDate(selected.order.slip_uploaded_at) : 'ยังไม่มี'}</p></div>
            </div>

            <h3>รายการ</h3>
            <ul className="admin-item-list">
              {(selected.items || parseItems(selected.order.items)).map((item, i) => (
                <li key={i}>{item.title} — ฿{Number(item.price).toLocaleString()}</li>
              ))}
            </ul>

            {(selected.order.status === 'successful' || selected.order.status === 'deposit_paid') && (
              <div style={{ marginTop: 16 }}>
                <p className="form-hint">
                  มัดจำ {selected.order.deposit_percent || 100}%
                  {selected.order.amount_paid > 0 && ` · ชำระแล้ว ฿${Number(selected.order.amount_paid).toLocaleString()}`}
                  {selected.order.amount_paid < selected.order.total && ` · คงเหลือ ฿${Number(selected.order.total - selected.order.amount_paid).toLocaleString()}`}
                </p>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={handleCreateProject}
                  disabled={creatingProject || saving}
                >
                  {creatingProject ? 'กำลังสร้าง...' : 'สร้างโปรเจกตจากออเดอร์นี้'}
                </button>
              </div>
            )}

            <div className="admin-modal-actions">
              <button type="button" className="admin-btn-danger" onClick={remove} disabled={saving}>ลบ</button>
              <button type="button" className="admin-btn-secondary" onClick={() => setSelected(null)}>ยกเลิก</button>
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

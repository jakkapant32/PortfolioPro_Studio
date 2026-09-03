import { useEffect, useMemo, useState } from 'react';
import { useRequireAdmin, PROJECT_STATUS_LABELS, formatDate } from '../../hooks/useRequireAdmin';
import {
  getProjects, getProject, saveContract, sendContract,
  saveDelivery, sendDelivery, deleteProject, updateProject,
} from '../../api/admin';
import AdminSearchInput from '../../components/admin/AdminSearchInput';
import { filterBySearch } from '../../utils/adminSearch';

const EMPTY_LINK = { label: '', url: '' };

export default function AdminProjects() {
  const { token, loading: authLoading } = useRequireAdmin();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [contractForm, setContractForm] = useState({ title: '', content: '' });
  const [deliveryForm, setDeliveryForm] = useState({ message: '', links: [{ ...EMPTY_LINK }] });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!token) return;
    const params = statusFilter ? { status: statusFilter } : {};
    getProjects(token, params)
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err.message));
  };

  useEffect(load, [token, statusFilter]);

  const filteredItems = useMemo(
    () => filterBySearch(items, search, [
      'id', 'title', 'customer_name', 'customer_email', 'order_id', 'status',
      (row) => PROJECT_STATUS_LABELS[row.status],
    ]),
    [items, search],
  );

  const openDetail = async (id) => {
    setError(null);
    setSuccess(null);
    try {
      const data = await getProject(token, id);
      setSelected(data);
      setContractForm({
        title: data.contract?.title || '',
        content: data.contract?.content || '',
      });
      const links = data.delivery?.links?.length ? data.delivery.links : [{ ...EMPTY_LINK }];
      setDeliveryForm({
        message: data.delivery?.message || '',
        links,
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const saveContractDraft = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const data = await saveContract(token, selected.project.id, contractForm);
      setSelected(data);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendContract = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await saveContract(token, selected.project.id, contractForm);
      const data = await sendContract(token, selected.project.id);
      setSelected(data);
      load();
      setSuccess('ส่งสัญญาแล้ว — ลูกค้าไปที่เมนู งานของฉัน แล้วกดการ์ดงานเพื่ออ่านและยอมรับสัญญา (ยังไม่มีอีเมลจนกว่าจะตั้ง SMTP)');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveDeliveryDraft = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const links = deliveryForm.links.filter((l) => l.url.trim());
      const data = await saveDelivery(token, selected.project.id, {
        message: deliveryForm.message,
        links,
      });
      setSelected(data);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendDelivery = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const links = deliveryForm.links.filter((l) => l.url.trim());
      await saveDelivery(token, selected.project.id, { message: deliveryForm.message, links });
      const data = await sendDelivery(token, selected.project.id);
      setSelected(data);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected || !window.confirm('ลบโปรเจกตนี้?')) return;
    setSaving(true);
    try {
      await deleteProject(token, selected.project.id);
      setSelected(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const setInProgress = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateProject(token, selected.project.id, { status: 'in_progress' });
      const data = await getProject(token, selected.project.id);
      setSelected(data);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addLink = () => {
    setDeliveryForm({ ...deliveryForm, links: [...deliveryForm.links, { ...EMPTY_LINK }] });
  };

  const updateLink = (index, field, value) => {
    const links = deliveryForm.links.map((l, i) => (i === index ? { ...l, [field]: value } : l));
    setDeliveryForm({ ...deliveryForm, links });
  };

  if (authLoading) return <div className="admin-loading">กำลังโหลด...</div>;

  const contract = selected?.contract;
  const delivery = selected?.delivery;
  const canEditContract = contract?.status !== 'accepted';
  const canSendContract = contract?.status === 'draft' || contract?.status === 'sent';
  const canDeliver = ['contract_accepted', 'in_progress', 'delivered', 'completed'].includes(selected?.project?.status);

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <h1>โปรเจกต / ส่งมอบงาน</h1>
        <p>ร่างสัญญา ส่งให้ลูกค้า และส่งมอบลิงก์งาน</p>
      </header>

      <div className="admin-toolbar">
        <AdminSearchInput
          value={search}
          onChange={setSearch}
          placeholder="ค้นหาชื่องาน, ลูกค้า, #ออเดอร์..."
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">ทุกสถานะ</option>
          {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
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
              <th>ชื่องาน</th>
              <th>ลูกค้า</th>
              <th>ออเดอร์</th>
              <th>สถานะ</th>
              <th>วันที่</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr><td colSpan={7} className="admin-empty">{search ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีโปรเจกต — สร้างจากหน้าคำสั่งซื้อ'}</td></tr>
            ) : filteredItems.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.title}</td>
                <td>
                  <div>{row.customer_name}</div>
                  <small>{row.customer_email}</small>
                </td>
                <td>{row.order_id ? `#${row.order_id}` : '-'}</td>
                <td>
                  <span className="admin-badge">{PROJECT_STATUS_LABELS[row.status] || row.status}</span>
                </td>
                <td>{formatDate(row.created_at)}</td>
                <td className="admin-actions">
                  <button type="button" className="admin-btn-secondary" onClick={() => openDetail(row.id)}>จัดการ</button>
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
            <h2>{selected.project.title}</h2>
            <p style={{ color: '#64748b', marginBottom: 12 }}>
              ลูกค้า: {selected.project.customer_name} ({selected.project.customer_email})
              {selected.order && ` · ออเดอร์ #${selected.order.id} ฿${Number(selected.order.total).toLocaleString()}`}
            </p>
            {error && <div className="form-error">{error}</div>}
            {success && <div className="form-success">{success}</div>}

            <div className="admin-project-section">
              <h3>1. สัญญา</h3>
              {canEditContract ? (
                <>
                  <div className="form-group">
                    <label>หัวข้อสัญญา</label>
                    <input value={contractForm.title} onChange={(e) => setContractForm({ ...contractForm, title: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>เนื้อหาสัญญา</label>
                    <textarea rows={10} value={contractForm.content} onChange={(e) => setContractForm({ ...contractForm, content: e.target.value })} />
                  </div>
                  <div className="admin-modal-actions">
                    <button type="button" className="admin-btn-secondary" onClick={saveContractDraft} disabled={saving}>บันทึก draft</button>
                    {canSendContract && contract?.status !== 'accepted' && (
                      <button type="button" className="btn-primary" onClick={handleSendContract} disabled={saving}>
                        {saving ? 'กำลังส่ง...' : contract?.status === 'sent' ? 'ส่งสัญญาอีกครั้ง' : 'ส่งสัญญาให้ลูกค้า'}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <p className="form-hint">ลูกค้ายอมรับแล้ว {formatDate(contract?.accepted_at)}</p>
              )}
              {contract?.status === 'sent' && (
                <p className="form-hint">
                  ส่งแล้ว — ลูกค้าเปิด <a href="/my-projects">งานของฉัน</a> แล้วกดการ์ดงานนี้เพื่อยอมรับสัญญา
                </p>
              )}
            </div>

            {contract?.status === 'accepted' && selected.project.status === 'contract_accepted' && (
              <div className="admin-project-section">
                <button type="button" className="admin-btn-secondary" onClick={setInProgress} disabled={saving}>
                  เริ่มดำเนินการ (In Progress)
                </button>
              </div>
            )}

            {canDeliver && (
              <div className="admin-project-section">
                <h3>2. ส่งมอบงาน</h3>
                <div className="form-group">
                  <label>ข้อความถึงลูกค้า</label>
                  <textarea rows={3} value={deliveryForm.message} onChange={(e) => setDeliveryForm({ ...deliveryForm, message: e.target.value })} placeholder="งานพร้อมแล้ว ลิงก์ด้านล่าง..." />
                </div>
                <label>ลิงก์งาน</label>
                {deliveryForm.links.map((link, i) => (
                  <div key={i} className="form-row delivery-link-row">
                    <input placeholder="ชื่อลิงก์ เช่น เว็บไซต์จริง" value={link.label} onChange={(e) => updateLink(i, 'label', e.target.value)} />
                    <input placeholder="https://..." value={link.url} onChange={(e) => updateLink(i, 'url', e.target.value)} />
                  </div>
                ))}
                <button type="button" className="admin-btn-secondary" style={{ marginBottom: 12 }} onClick={addLink}>+ เพิ่มลิงก์</button>
                <div className="admin-modal-actions">
                  <button type="button" className="admin-btn-secondary" onClick={saveDeliveryDraft} disabled={saving}>บันทึก draft</button>
                  {delivery?.status !== 'received' && (
                    <button type="button" className="btn-primary" onClick={handleSendDelivery} disabled={saving}>
                      ส่งมอบให้ลูกค้า
                    </button>
                  )}
                </div>
                {delivery?.status === 'sent' && <p className="form-hint">รอลูกค้ายืนยันรับงาน</p>}
                {delivery?.status === 'received' && <p className="form-hint">ลูกค้ารับงานแล้ว {formatDate(delivery.received_at)}</p>}
              </div>
            )}

            <div className="admin-modal-actions" style={{ marginTop: 24, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
              <button type="button" className="admin-btn-danger" onClick={handleDelete} disabled={saving}>ลบโปรเจกต</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import {
  useRequireAdmin, ORDER_STATUS_LABELS, PROJECT_STATUS_LABELS, formatDate, parseItems,
} from '../../hooks/useRequireAdmin';
import {
  getOrders, getOrder, updateOrder, deleteOrder, createProjectFromOrder,
  confirmOrderPayment, rejectOrderPayment,
  getProjects, getProject, saveContract, sendContract,
  saveDelivery, sendDelivery, updateProject,
} from '../../api/admin';
import { fetchAdminPaymentSlip } from '../../api/payment';
import AdminSearchInput from '../../components/admin/AdminSearchInput';
import { filterBySearch } from '../../utils/adminSearch';

const EMPTY_ORDER_FORM = {
  customer_name: '',
  customer_email: '',
  payment_method: '',
  total: '',
  status: 'pending',
};
const EMPTY_LINK = { label: '', url: '' };

const STAGE_FILTERS = [
  { id: '', label: 'ทุกงาน' },
  { id: 'payment', label: 'รอชำระ / ตรวจสลิป' },
  { id: 'contract', label: 'รอสัญญา' },
  { id: 'progress', label: 'กำลังทำงาน' },
  { id: 'done', label: 'ส่งมอบ / ปิดงาน' },
];

function orderTitle(order) {
  const items = Array.isArray(order.items) ? order.items : parseItems(order.items);
  if (items.length) {
    return items.map((i) => i.title).filter(Boolean).join(', ');
  }
  return `คำสั่งซื้อ #${order.id}`;
}

function rowStage(order, project) {
  if (['awaiting_payment', 'rejected', 'slip_submitted', 'pending', 'failed', 'expired'].includes(order.status)) {
    return 'payment';
  }
  if (!project || project.status === 'pending' || project.status === 'contract_sent') {
    return 'contract';
  }
  if (['contract_accepted', 'in_progress'].includes(project.status)) return 'progress';
  return 'done';
}

function actionLabel(order, project) {
  if (order.status === 'slip_submitted') return 'ดูสลิป';
  if (['awaiting_payment', 'rejected', 'pending'].includes(order.status)) return 'รอสลิป';
  if (!project || project.status === 'pending') return 'ส่งสัญญา';
  if (project.status === 'contract_sent') return 'รอเซ็นสัญญา';
  if (project.status === 'contract_accepted') return 'เริ่มงาน';
  if (project.status === 'in_progress') return 'ส่งมอบ';
  if (project.status === 'delivered') return 'รอรับงาน';
  return 'เปิด';
}

export default function AdminWork() {
  const { token, loading: authLoading } = useRequireAdmin();
  const [orders, setOrders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stageFilter, setStageFilter] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('payment');
  const [orderDetail, setOrderDetail] = useState(null);
  const [projectDetail, setProjectDetail] = useState(null);
  const [orderForm, setOrderForm] = useState(EMPTY_ORDER_FORM);
  const [contractForm, setContractForm] = useState({ title: '', content: '' });
  const [deliveryForm, setDeliveryForm] = useState({ message: '', links: [{ ...EMPTY_LINK }] });
  const [slipUrl, setSlipUrl] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [saving, setSaving] = useState(false);

  const projectByOrderId = useMemo(() => {
    const map = new Map();
    projects.forEach((p) => {
      if (p.order_id) map.set(Number(p.order_id), p);
    });
    return map;
  }, [projects]);

  const load = () => {
    if (!token) return;
    Promise.all([getOrders(token), getProjects(token)])
      .then(([orderData, projectData]) => {
        setOrders(orderData.items || []);
        setProjects(projectData.items || []);
      })
      .catch((err) => setError(err.message));
  };

  useEffect(load, [token]);

  const rows = useMemo(() => {
    const list = orders.map((order) => {
      const project = projectByOrderId.get(Number(order.id));
      return { order, project, stage: rowStage(order, project) };
    });
    return stageFilter ? list.filter((row) => row.stage === stageFilter) : list;
  }, [orders, projectByOrderId, stageFilter]);

  const filteredRows = useMemo(
    () => filterBySearch(rows, search, [
      (row) => row.order.id,
      (row) => row.order.customer_name,
      (row) => row.order.customer_email,
      (row) => row.order.payment_method,
      (row) => row.order.status,
      (row) => row.order.total,
      (row) => ORDER_STATUS_LABELS[row.order.status],
      (row) => row.project?.title,
      (row) => PROJECT_STATUS_LABELS[row.project?.status],
      (row) => orderTitle(row.order),
    ]),
    [rows, search],
  );

  const applyProjectDetail = (data) => {
    setProjectDetail(data);
    setContractForm({
      title: data.contract?.title || '',
      content: data.contract?.content || '',
    });
    const links = data.delivery?.links?.length ? data.delivery.links : [{ ...EMPTY_LINK }];
    setDeliveryForm({ message: data.delivery?.message || '', links });
  };

  const loadProjectForOrder = async (orderId, preferredTab) => {
    const list = await getProjects(token);
    setProjects(list.items || []);
    const match = (list.items || []).find((p) => Number(p.order_id) === Number(orderId));
    if (!match) {
      setProjectDetail(null);
      return;
    }
    const data = await getProject(token, match.id);
    applyProjectDetail(data);
    if (preferredTab) setTab(preferredTab);
  };

  const openRow = async (orderId, preferredTab) => {
    setError(null);
    setSuccess(null);
    try {
      const data = await getOrder(token, orderId);
      setOrderDetail(data);
      setRejectReason('');
      setOrderForm({
        customer_name: data.order.customer_name || '',
        customer_email: data.order.customer_email || '',
        payment_method: data.order.payment_method || '',
        total: String(data.order.total ?? ''),
        status: data.order.status || 'pending',
      });
      if (slipUrl) URL.revokeObjectURL(slipUrl);
      setSlipUrl(null);
      if (data.has_slip || data.order?.slip_filename) {
        try {
          setSlipUrl(await fetchAdminPaymentSlip(orderId, token));
        } catch {
          setSlipUrl(null);
        }
      }
      const paid = data.order.status === 'successful' || data.order.status === 'deposit_paid';
      await loadProjectForOrder(orderId, preferredTab || (paid && data.order.status !== 'slip_submitted' ? 'work' : 'payment'));
      if (!preferredTab && data.order.status === 'slip_submitted') setTab('payment');
    } catch (err) {
      setError(err.message);
    }
  };

  const closeDetail = () => {
    if (slipUrl) URL.revokeObjectURL(slipUrl);
    setSlipUrl(null);
    setOrderDetail(null);
    setProjectDetail(null);
    setSuccess(null);
  };

  const saveOrder = async () => {
    if (!orderDetail) return;
    setSaving(true);
    setError(null);
    try {
      await updateOrder(token, orderDetail.order.id, {
        customer_name: orderForm.customer_name,
        customer_email: orderForm.customer_email,
        payment_method: orderForm.payment_method,
        total: Number(orderForm.total),
        status: orderForm.status,
      });
      await openRow(orderDetail.order.id, tab);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!orderDetail) return;
    if (!window.confirm(`ยืนยันว่าได้รับเงินสำหรับคำสั่งซื้อ #${orderDetail.order.id}?`)) return;
    setSaving(true);
    setError(null);
    try {
      await confirmOrderPayment(token, orderDetail.order.id);
      await openRow(orderDetail.order.id, 'work');
      load();
      setSuccess('ยืนยันการชำระแล้ว — ส่งสัญญาได้ในแท็บถัดไป');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!orderDetail) return;
    setSaving(true);
    setError(null);
    try {
      await rejectOrderPayment(token, orderDetail.order.id, rejectReason);
      await openRow(orderDetail.order.id, 'payment');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const ensureProject = async () => {
    if (!orderDetail) return;
    setSaving(true);
    setError(null);
    try {
      await createProjectFromOrder(token, orderDetail.order.id);
      await loadProjectForOrder(orderDetail.order.id, 'work');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendContract = async () => {
    if (!projectDetail) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await saveContract(token, projectDetail.project.id, contractForm);
      const data = await sendContract(token, projectDetail.project.id);
      applyProjectDetail(data);
      load();
      setSuccess('ส่งสัญญาแล้ว — ลูกค้าเปิด งานของฉัน แล้วกดการ์ดงานเพื่อยอมรับ');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveContractDraft = async () => {
    if (!projectDetail) return;
    setSaving(true);
    setError(null);
    try {
      applyProjectDetail(await saveContract(token, projectDetail.project.id, contractForm));
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendDelivery = async () => {
    if (!projectDetail) return;
    setSaving(true);
    setError(null);
    try {
      const links = deliveryForm.links.filter((l) => l.url.trim());
      await saveDelivery(token, projectDetail.project.id, { message: deliveryForm.message, links });
      applyProjectDetail(await sendDelivery(token, projectDetail.project.id));
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveDeliveryDraft = async () => {
    if (!projectDetail) return;
    setSaving(true);
    setError(null);
    try {
      const links = deliveryForm.links.filter((l) => l.url.trim());
      applyProjectDetail(await saveDelivery(token, projectDetail.project.id, {
        message: deliveryForm.message,
        links,
      }));
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const setInProgress = async () => {
    if (!projectDetail) return;
    setSaving(true);
    try {
      await updateProject(token, projectDetail.project.id, { status: 'in_progress' });
      applyProjectDetail(await getProject(token, projectDetail.project.id));
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeOrder = async () => {
    if (!orderDetail || !window.confirm(`ลบคำสั่งซื้อ #${orderDetail.order.id}?`)) return;
    setSaving(true);
    setError(null);
    try {
      await deleteOrder(token, orderDetail.order.id);
      closeDetail();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <div className="admin-loading">กำลังโหลด...</div>;

  const order = orderDetail?.order;
  const contract = projectDetail?.contract;
  const delivery = projectDetail?.delivery;
  const canEditContract = contract?.status !== 'accepted';
  const canSendContract = contract?.status === 'draft' || contract?.status === 'sent';
  const canDeliver = ['contract_accepted', 'in_progress', 'delivered', 'completed'].includes(projectDetail?.project?.status);
  const paid = order?.status === 'successful' || order?.status === 'deposit_paid';

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <h1>คำสั่งซื้อและส่งมอบ</h1>
        <p>ตรวจสลิป ยืนยันออเดอร์ ส่งสัญญา และส่งมอบงานในหน้าเดียว</p>
      </header>

      <div className="admin-toolbar">
        <AdminSearchInput
          value={search}
          onChange={setSearch}
          placeholder="ค้นหาชื่อ, อีเมล, #ออเดอร์, ชื่องาน..."
        />
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
          {STAGE_FILTERS.map((opt) => (
            <option key={opt.id || 'all'} value={opt.id}>{opt.label}</option>
          ))}
        </select>
      </div>

      {error && !orderDetail && <div className="form-error">{error}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>งาน / ลูกค้า</th>
              <th>ยอด</th>
              <th>ชำระเงิน</th>
              <th>งานส่งมอบ</th>
              <th>วันที่</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="admin-empty">
                  {search ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีคำสั่งซื้อ'}
                </td>
              </tr>
            ) : filteredRows.map(({ order: row, project }) => (
              <tr key={row.id}>
                <td className="admin-row-click" onClick={() => openRow(row.id)}>{row.id}</td>
                <td className="admin-row-click" onClick={() => openRow(row.id)}>
                  <div>{project?.title || orderTitle(row)}</div>
                  <small>{row.customer_name} · {row.customer_email}</small>
                </td>
                <td className="admin-row-click" onClick={() => openRow(row.id)}>฿{Number(row.total).toLocaleString()}</td>
                <td className="admin-row-click" onClick={() => openRow(row.id)}>
                  <span className={`admin-badge status-${row.status}`}>{ORDER_STATUS_LABELS[row.status] || row.status}</span>
                </td>
                <td className="admin-row-click" onClick={() => openRow(row.id)}>
                  {project
                    ? <span className={`admin-badge status-${project.status === 'completed' ? 'successful' : 'pending'}`}>{PROJECT_STATUS_LABELS[project.status] || project.status}</span>
                    : <small>ยังไม่มีโปรเจกต์</small>}
                </td>
                <td className="admin-row-click" onClick={() => openRow(row.id)}>{formatDate(row.created_at)}</td>
                <td className="admin-actions">
                  <button
                    type="button"
                    className={row.status === 'slip_submitted' || project?.status === 'pending' ? 'btn-primary' : 'admin-btn-secondary'}
                    onClick={() => openRow(row.id)}
                  >
                    {actionLabel(row, project)}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {orderDetail && order && (
        <div className="admin-modal-overlay" onClick={closeDetail}>
          <div className="admin-modal admin-modal-wide" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="admin-modal-close" onClick={closeDetail}>&times;</button>
            <h2>#{order.id} · {projectDetail?.project?.title || orderTitle(order)}</h2>
            <p style={{ color: '#64748b', marginBottom: 12 }}>
              {order.customer_name} ({order.customer_email}) · ฿{Number(order.total).toLocaleString()}
            </p>
            {error && <div className="form-error">{error}</div>}
            {success && <div className="form-success">{success}</div>}

            <div className="admin-work-tabs">
              <button type="button" className={`admin-work-tab ${tab === 'payment' ? 'active' : ''}`} onClick={() => setTab('payment')}>
                1. ชำระเงิน / สลิป
              </button>
              <button type="button" className={`admin-work-tab ${tab === 'work' ? 'active' : ''}`} onClick={() => setTab('work')}>
                2. สัญญา / ส่งมอบ
              </button>
            </div>

            {tab === 'payment' && (
              <>
                {slipUrl && (
                  <div className="admin-slip-wrap">
                    <h3>สลิปโอนเงิน</h3>
                    <a href={slipUrl} target="_blank" rel="noreferrer">
                      <img src={slipUrl} alt="สลิปโอนเงิน" className="admin-slip-image" />
                    </a>
                  </div>
                )}

                {order.status === 'slip_submitted' && (
                  <div className="admin-slip-actions">
                    <p className="form-hint">ตรวจยอดและชื่อบัญชีในสลิปให้ตรง แล้วกดยืนยัน หรือปฏิเสธให้ลูกค้าแนบใหม่</p>
                    <textarea
                      rows={2}
                      placeholder="เหตุผลถ้าปฏิเสธ (ไม่บังคับ)"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <div className="admin-modal-actions" style={{ marginTop: 8 }}>
                      <button type="button" className="admin-btn-danger" onClick={handleRejectPayment} disabled={saving}>ปฏิเสธสลิป</button>
                      <button type="button" className="btn-primary" onClick={handleConfirmPayment} disabled={saving}>
                        {saving ? 'กำลังบันทึก...' : 'ยืนยันการสั่งซื้อ'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>ชื่อลูกค้า</label>
                    <input value={orderForm.customer_name} onChange={(e) => setOrderForm({ ...orderForm, customer_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>อีเมล</label>
                    <input type="email" value={orderForm.customer_email} onChange={(e) => setOrderForm({ ...orderForm, customer_email: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>ยอดชำระ (฿)</label>
                    <input type="number" min="1" value={orderForm.total} onChange={(e) => setOrderForm({ ...orderForm, total: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>ช่องทางชำระ</label>
                    <input value={orderForm.payment_method} onChange={(e) => setOrderForm({ ...orderForm, payment_method: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>สถานะการชำระ</label>
                  <select value={orderForm.status} onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value })}>
                    {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                <div className="admin-detail-grid" style={{ marginTop: 12 }}>
                  <div><strong>ชำระเมื่อ</strong><p>{formatDate(order.paid_at)}</p></div>
                  {order.coupon_code && (
                    <div><strong>คูปอง</strong><p>{order.coupon_code} (-฿{Number(order.discount_amount || 0).toLocaleString()})</p></div>
                  )}
                  <div><strong>แนบสลิป</strong><p>{order.slip_uploaded_at ? formatDate(order.slip_uploaded_at) : 'ยังไม่มี'}</p></div>
                </div>

                <h3>รายการ</h3>
                <ul className="admin-item-list">
                  {(orderDetail.items || parseItems(order.items)).map((item, i) => (
                    <li key={i}>{item.title} — ฿{Number(item.price).toLocaleString()}</li>
                  ))}
                </ul>

                {paid && (
                  <p className="form-hint" style={{ marginTop: 12 }}>
                    มัดจำ {order.deposit_percent || 100}%
                    {order.amount_paid > 0 && ` · ชำระแล้ว ฿${Number(order.amount_paid).toLocaleString()}`}
                    {order.amount_paid < order.total && ` · คงเหลือ ฿${Number(order.total - order.amount_paid).toLocaleString()}`}
                  </p>
                )}

                <div className="admin-modal-actions">
                  <button type="button" className="admin-btn-danger" onClick={removeOrder} disabled={saving}>ลบออเดอร์</button>
                  <button type="button" className="admin-btn-secondary" onClick={closeDetail}>ปิด</button>
                  <button type="button" className="btn-primary" onClick={saveOrder} disabled={saving}>
                    {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                </div>
              </>
            )}

            {tab === 'work' && (
              <>
                {!paid && (
                  <p className="form-hint">ยืนยันสลิปในแท็บชำระเงินก่อน จึงจะส่งสัญญาได้</p>
                )}

                {paid && !projectDetail && (
                  <div className="admin-project-section" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
                    <p className="form-hint">ยังไม่มีโปรเจกต์ของออเดอร์นี้</p>
                    <button type="button" className="btn-primary" onClick={ensureProject} disabled={saving}>
                      {saving ? 'กำลังสร้าง...' : 'สร้างโปรเจกต์แล้วไปส่งสัญญา'}
                    </button>
                  </div>
                )}

                {projectDetail && (
                  <>
                    <div className="admin-project-section" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
                      <h3>สัญญา</h3>
                      {canEditContract ? (
                        <>
                          <div className="form-group">
                            <label>หัวข้อสัญญา</label>
                            <input value={contractForm.title} onChange={(e) => setContractForm({ ...contractForm, title: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>เนื้อหาสัญญา</label>
                            <textarea rows={8} value={contractForm.content} onChange={(e) => setContractForm({ ...contractForm, content: e.target.value })} />
                          </div>
                          <div className="admin-modal-actions">
                            <button type="button" className="admin-btn-secondary" onClick={saveContractDraft} disabled={saving}>บันทึก draft</button>
                            {canSendContract && (
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
                        <p className="form-hint">ส่งแล้ว — ลูกค้าเปิด <a href="/my-projects">งานของฉัน</a> เพื่อยอมรับสัญญา</p>
                      )}
                    </div>

                    {contract?.status === 'accepted' && projectDetail.project.status === 'contract_accepted' && (
                      <div className="admin-project-section">
                        <button type="button" className="admin-btn-secondary" onClick={setInProgress} disabled={saving}>
                          เริ่มดำเนินการ
                        </button>
                      </div>
                    )}

                    {canDeliver && (
                      <div className="admin-project-section">
                        <h3>ส่งมอบงาน</h3>
                        <div className="form-group">
                          <label>ข้อความถึงลูกค้า</label>
                          <textarea rows={3} value={deliveryForm.message} onChange={(e) => setDeliveryForm({ ...deliveryForm, message: e.target.value })} placeholder="งานพร้อมแล้ว ลิงก์ด้านล่าง..." />
                        </div>
                        <label>ลิงก์งาน</label>
                        {deliveryForm.links.map((link, i) => (
                          <div key={i} className="form-row delivery-link-row">
                            <input placeholder="ชื่อลิงก์" value={link.label} onChange={(e) => {
                              const links = deliveryForm.links.map((l, idx) => (idx === i ? { ...l, label: e.target.value } : l));
                              setDeliveryForm({ ...deliveryForm, links });
                            }} />
                            <input placeholder="https://..." value={link.url} onChange={(e) => {
                              const links = deliveryForm.links.map((l, idx) => (idx === i ? { ...l, url: e.target.value } : l));
                              setDeliveryForm({ ...deliveryForm, links });
                            }} />
                          </div>
                        ))}
                        <button
                          type="button"
                          className="admin-btn-secondary"
                          style={{ marginBottom: 12 }}
                          onClick={() => setDeliveryForm({ ...deliveryForm, links: [...deliveryForm.links, { ...EMPTY_LINK }] })}
                        >
                          + เพิ่มลิงก์
                        </button>
                        <div className="admin-modal-actions">
                          <button type="button" className="admin-btn-secondary" onClick={saveDeliveryDraft} disabled={saving}>บันทึก draft</button>
                          {delivery?.status !== 'received' && (
                            <button type="button" className="btn-primary" onClick={handleSendDelivery} disabled={saving}>ส่งมอบให้ลูกค้า</button>
                          )}
                        </div>
                        {delivery?.status === 'sent' && <p className="form-hint">รอลูกค้ายืนยันรับงาน</p>}
                        {delivery?.status === 'received' && <p className="form-hint">ลูกค้ารับงานแล้ว {formatDate(delivery.received_at)}</p>}
                      </div>
                    )}
                  </>
                )}

                <div className="admin-modal-actions" style={{ marginTop: 24 }}>
                  <button type="button" className="admin-btn-secondary" onClick={closeDetail}>ปิด</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

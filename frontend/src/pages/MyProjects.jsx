import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import SEO from '../components/SEO';
import ProjectChecklist from '../components/ProjectChecklist';
import BalancePaymentModal from '../components/BalancePaymentModal';
import PaymentModal from '../components/PaymentModal';
import { getMyProjects, getMyProject, acceptContract, receiveDelivery } from '../api/projects';
import { derivePaymentState } from '../utils/paymentState';
import { getPaymentConfig } from '../api/payment';

const STATUS_LABELS = {
  pending: 'รอร่างสัญญา',
  contract_sent: 'รอคุณยอมรับสัญญา',
  contract_accepted: 'ยอมรับสัญญาแล้ว',
  in_progress: 'กำลังดำเนินการ',
  delivered: 'งานพร้อมรับ',
  completed: 'ปิดงานแล้ว',
};

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('th-TH', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function MyProjects() {
  const { token } = useAuth();
  const { requireAuth, isAuthenticated } = useRequireAuth();
  const [searchParams] = useSearchParams();
  const welcome = searchParams.get('welcome') === '1';
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [balanceOrder, setBalanceOrder] = useState(null);
  const [balancePayment, setBalancePayment] = useState(null);

  const load = () => {
    if (!token) return;
    getMyProjects(token)
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAuthenticated) {
      requireAuth();
      setLoading(false);
      return;
    }
    load();
  }, [token, isAuthenticated]);

  const openDetail = async (id) => {
    setError(null);
    try {
      const data = await getMyProject(token, id);
      setSelected(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAcceptContract = async () => {
    if (!selected || !window.confirm('ยืนยันการยอมรับสัญญา?')) return;
    setSaving(true);
    try {
      const data = await acceptContract(token, selected.project.id);
      setSelected(data);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReceive = async () => {
    if (!selected || !window.confirm('ยืนยันรับงานแล้ว — คุณเป็นเจ้าของงานตามสัญญา')) return;
    setSaving(true);
    try {
      const data = await receiveDelivery(token, selected.project.id);
      setSelected(data);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const contract = selected?.contract;
  const delivery = selected?.delivery;
  const orderInfo = selected?.order;
  const canAccept = contract?.status === 'sent';
  const canReceive = delivery?.status === 'sent';
  const links = delivery?.links || [];
  const latestProject = items[0];
  const awaitingContract = items.find((row) => row.status === 'contract_sent' || row.contract_status === 'sent');
  const payment = derivePaymentState(orderInfo);
  const { depositPercent, amountPaid, amountDue, fullyPaid, needsBalance } = payment;
  const pendingSlip = orderInfo && ['awaiting_payment', 'rejected', 'slip_submitted'].includes(orderInfo.status);
  const listPayment = latestProject ? derivePaymentState({
    deposit_percent: latestProject.deposit_percent,
    amount_paid: latestProject.amount_paid,
    amount_due: latestProject.amount_due,
    fully_paid: latestProject.fully_paid,
    status: latestProject.order_status,
    total: latestProject.order_total,
  }) : null;

  return (
    <>
      <SEO title="งานของฉัน" description="ดูสัญญาและรับงานที่ส่งมอบจาก PortfolioPro Studio" path="/my-projects" />

      <header className="page-header">
        <div className="container">
          <div className="section-label">
            <svg><use href="#icon-briefcase" /></svg>
            My Projects
          </div>
          <h1 className="page-title">งานของฉัน</h1>
          <p className="page-desc">ดูสัญญา ยอมรับข้อตกลง และรับลิงก์งานที่ส่งมอบ</p>
        </div>
      </header>

      <section className="my-projects-section">
        <div className="container">
          {welcome && latestProject && (
            <div className="my-projects-welcome">
              <h2>ชำระเงินสำเร็จ — ยินดีต้อนรับ!</h2>
              <p>โปรเจกต <strong>{latestProject.title}</strong> ถูกสร้างแล้ว ทำตามขั้นตอนนี้:</p>
              <ProjectChecklist
                status={latestProject.status}
                depositPercent={listPayment?.depositPercent || 100}
                fullyPaid={listPayment?.fullyPaid ?? true}
              />
            </div>
          )}

          {!welcome && latestProject && latestProject.status !== 'completed' && (
            <div className="my-projects-progress">
              <h2>ความคืบหน้างานล่าสุด</h2>
              <p>{latestProject.title}</p>
              <ProjectChecklist status={latestProject.status} depositPercent={listPayment?.depositPercent || 100} fullyPaid={listPayment?.fullyPaid ?? true} compact />
            </div>
          )}

          {awaitingContract && (
            <div className="my-projects-welcome">
              <h2>มีสัญญาให้ยอมรับ</h2>
              <p>แอดมินส่งสัญญาของงาน <strong>{awaitingContract.title}</strong> แล้ว กรุณาเปิดอ่านแล้วกดยอมรับ</p>
              <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => openDetail(awaitingContract.id)}>
                เปิดสัญญาและยอมรับ
              </button>
            </div>
          )}

          {!isAuthenticated ? (
            <p className="portfolio-empty">กรุณาเข้าสู่ระบบเพื่อดูงานของคุณ</p>
          ) : loading ? (
            <p className="portfolio-empty">กำลังโหลด...</p>
          ) : error && !selected ? (
            <div className="form-error">{error}</div>
          ) : items.length === 0 ? (
            <p className="portfolio-empty">ยังไม่มีงาน — หลังชำระเงินสำเร็จ งานจะปรากฏที่นี่</p>
          ) : (
            <div className="my-projects-grid">
              {items.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="my-project-card"
                  onClick={() => openDetail(row.id)}
                >
                  <h3>{row.title}</h3>
                  <span className={`admin-badge status-${row.status === 'completed' ? 'successful' : row.status === 'contract_sent' ? 'deposit_paid' : 'pending'}`}>
                    {STATUS_LABELS[row.status] || row.status}
                  </span>
                  {(row.status === 'contract_sent' || row.contract_status === 'sent') && (
                    <small>กดเพื่ออ่านและยอมรับสัญญา</small>
                  )}
                  {row.amount_due > 0 && !row.fully_paid && (
                    <span className="deposit-badge">ค้างชำระ ฿{Number(row.amount_due).toLocaleString()}</span>
                  )}
                  <small>{formatDate(row.created_at)}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {selected && (
        <div className="admin-modal-overlay" onClick={() => setSelected(null)}>
          <div className="admin-modal admin-modal-wide my-project-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="admin-modal-close" onClick={() => setSelected(null)}>&times;</button>
            <h2>{selected.project.title}</h2>
            <p className="my-project-status">
              สถานะ: <strong>{STATUS_LABELS[selected.project.status] || selected.project.status}</strong>
            </p>
            {error && <div className="form-error">{error}</div>}

            {orderInfo && (
              <div className="my-project-payment-info">
                <p>
                  ยอดรวม ฿{Number(orderInfo.total).toLocaleString()}
                  {amountPaid > 0 && ` · ชำระแล้ว ฿${amountPaid.toLocaleString()}`}
                  {!fullyPaid && ` · คงเหลือ ฿${amountDue.toLocaleString()}`}
                </p>
                {orderInfo.sla_label && <p className="form-hint">{orderInfo.sla_label}</p>}
                {needsBalance && (
                  <button type="button" className="btn-primary" onClick={() => setBalanceOrder({ id: orderInfo.id, amount_due: amountDue })}>
                    ชำระยอดที่เหลือ ฿{amountDue.toLocaleString()}
                  </button>
                )}
                {pendingSlip && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={async () => {
                      const cfg = await getPaymentConfig().catch(() => ({}));
                      setBalancePayment({
                        ...orderInfo,
                        ...cfg,
                        order_id: orderInfo.id,
                        method: 'bank_transfer',
                        amount: orderInfo.charge_amount || amountDue || orderInfo.total,
                        token,
                      });
                    }}
                  >
                    {orderInfo.status === 'slip_submitted' ? 'ดูสถานะสลิป' : 'โอนเงินและแนบสลิป'}
                  </button>
                )}
              </div>
            )}

            {contract?.content && (contract.status === 'sent' || contract.status === 'accepted') && (
              <div className="my-project-block">
                <h3>สัญญา{contract.status === 'accepted' ? ' (ยอมรับแล้ว)' : ' (รอคุณยอมรับ)'}</h3>
                <ProjectChecklist status={selected.project.status} depositPercent={depositPercent} fullyPaid={fullyPaid} compact />
                {contract.title && <p><strong>{contract.title}</strong></p>}
                <pre className="contract-content">{contract.content}</pre>
                {contract.accepted_at && (
                  <p className="form-hint">ยอมรับเมื่อ {formatDate(contract.accepted_at)}</p>
                )}
                {canAccept && (
                  <button type="button" className="btn-primary" onClick={handleAcceptContract} disabled={saving}>
                    {saving ? 'กำลังบันทึก...' : 'ยอมรับสัญญา'}
                  </button>
                )}
              </div>
            )}

            {delivery?.status && delivery.status !== 'draft' && (
              <div className="my-project-block">
                <h3>งานที่ส่งมอบ</h3>
                {delivery.message && <p>{delivery.message}</p>}
                {links.length > 0 && (
                  <ul className="delivery-links">
                    {links.map((link, i) => (
                      <li key={i}>
                        <a href={link.url} target="_blank" rel="noopener noreferrer">
                          {link.label || link.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                {canReceive && (
                  <button type="button" className="btn-primary" onClick={handleReceive} disabled={saving}>
                    {saving ? 'กำลังบันทึก...' : 'ยืนยันรับงานแล้ว'}
                  </button>
                )}
                {delivery.received_at && (
                  <p className="form-hint">รับงานเมื่อ {formatDate(delivery.received_at)}</p>
                )}
              </div>
            )}

            {(!contract?.status || contract.status === 'draft') && (
              <p className="portfolio-empty">แอดมินกำลังจัดเตรียมสัญญา</p>
            )}
          </div>
        </div>
      )}

      <BalancePaymentModal
        open={!!balanceOrder}
        order={balanceOrder}
        token={token}
        onClose={() => setBalanceOrder(null)}
        onPaymentReady={(result) => setBalancePayment(result)}
      />

      <PaymentModal
        payment={balancePayment}
        onClose={() => setBalancePayment(null)}
        onSuccess={() => {
          setBalancePayment(null);
          setBalanceOrder(null);
          load();
          if (selected) openDetail(selected.project.id);
        }}
        onGoToProjects={() => setBalancePayment(null)}
      />
    </>
  );
}

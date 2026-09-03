import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import SEO from '../components/SEO';
import { getMyOrders } from '../api/orders';
import { derivePaymentState } from '../utils/paymentState';
import PaymentModal from '../components/PaymentModal';
import { getPaymentConfig } from '../api/payment';

const ORDER_STATUS_LABELS = {
  pending: 'รอชำระ',
  awaiting_payment: 'รอโอน/รอแนบสลิป',
  slip_submitted: 'รอตรวจสอบสลิป',
  rejected: 'สลิปไม่ผ่าน',
  deposit_paid: 'มัดจำแล้ว',
  successful: 'ยืนยันแล้ว',
  failed: 'ล้มเหลว',
  expired: 'หมดเวลา',
};

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('th-TH', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function MyOrders() {
  const { token } = useAuth();
  const { requireAuth, isAuthenticated, loading: authLoading } = useRequireAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePayment, setActivePayment] = useState(null);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      requireAuth();
      setLoading(false);
      return;
    }

    if (!token) return;

    setLoading(true);
    getMyOrders(token)
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, isAuthenticated, authLoading]);

  return (
    <>
      <SEO title="คำสั่งซื้อของฉัน" description="ประวัติการชำระเงินและสถานะคำสั่งซื้อ" path="/my-orders" />

      <header className="page-header">
        <div className="container">
          <div className="section-label">
            <svg><use href="#icon-credit-card" /></svg>
            My Orders
          </div>
          <h1 className="page-title">คำสั่งซื้อของฉัน</h1>
          <p className="page-desc">ประวัติการชำระเงินและยอดคงเหลือ (ถ้ามี)</p>
        </div>
      </header>

      <section className="my-projects-section">
        <div className="container">
          {(authLoading || loading) && (
            <p className="admin-loading">กำลังโหลด...</p>
          )}

          {!authLoading && !isAuthenticated && (
            <div className="my-projects-welcome">
              <h2>กรุณาเข้าสู่ระบบ</h2>
              <p>เข้าสู่ระบบเพื่อดูประวัติคำสั่งซื้อของคุณ</p>
              <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => requireAuth()}>
                เข้าสู่ระบบ
              </button>
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          {isAuthenticated && !loading && !error && items.length === 0 && (
            <div className="my-projects-welcome">
              <h2>ยังไม่มีคำสั่งซื้อ</h2>
              <p>เลือกแพ็กเกจจากหน้า Portfolio แล้วชำระเงินได้เลย</p>
              <Link to="/portfolio" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-block' }}>
                ดูบริการ
              </Link>
            </div>
          )}

          {isAuthenticated && !loading && items.length > 0 && (
            <div className="my-orders-list">
              {items.map((order) => {
                const payment = derivePaymentState(order);
                const titles = (order.items || []).map((i) => i.title).join(', ') || 'คำสั่งซื้อ';
                const depositPercent = order.deposit_percent ?? 100;

                return (
                  <article key={order.id} className="my-order-card">
                    <div className="my-order-card-head">
                      <div>
                        <h3>#{order.id} · {titles}</h3>
                        <p className="my-order-meta">{formatDate(order.created_at)}</p>
                      </div>
                      <span className={`order-status-badge status-${order.status}`}>
                        {ORDER_STATUS_LABELS[order.status] || order.status}
                      </span>
                    </div>
                    <div className="my-order-card-body">
                      <div className="my-order-row">
                        <span>ยอดรวม</span>
                        <strong>฿{Number(order.total || 0).toLocaleString()}</strong>
                      </div>
                      {depositPercent < 100 && (
                        <>
                          <div className="my-order-row">
                            <span>มัดจำ ({depositPercent}%)</span>
                            <span>฿{Number(payment.amountPaid || 0).toLocaleString()}</span>
                          </div>
                          {payment.needsBalance && (
                            <div className="my-order-row highlight">
                              <span>ยอดคงเหลือ</span>
                              <strong>฿{Number(payment.amountDue || 0).toLocaleString()}</strong>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    {(order.status === 'deposit_paid' || order.status === 'successful') && (
                      <div className="my-order-card-foot">
                        <Link to="/my-projects" className="btn btn-outline btn-sm">
                          ไปที่งานของฉัน →
                        </Link>
                      </div>
                    )}
                    {['awaiting_payment', 'rejected', 'slip_submitted'].includes(order.status) && (
                      <div className="my-order-card-foot">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={async () => {
                            const cfg = await getPaymentConfig().catch(() => ({}));
                            setActivePayment({
                              ...order,
                              ...cfg,
                              order_id: order.id,
                              method: 'bank_transfer',
                              amount: order.charge_amount || payment.amountDue || order.total,
                              token,
                            });
                          }}
                        >
                          {order.status === 'slip_submitted' ? 'ดูสถานะสลิป' : 'โอนเงินและแนบสลิป'}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <PaymentModal
        payment={activePayment}
        onClose={() => setActivePayment(null)}
        onSuccess={() => {
          if (token) {
            getMyOrders(token).then((data) => setItems(data.items || [])).catch(() => {});
          }
        }}
        onGoToProjects={() => {
          setActivePayment(null);
          navigate('/my-projects?welcome=1');
        }}
      />
    </>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { completePayment } from '../api/payment';
import SEO from '../components/SEO';
import ProjectChecklist from '../components/ProjectChecklist';
import { trackEvent, AnalyticsEvents } from '../utils/trackEvent';

export default function PaymentReturn() {
  const { token } = useAuth();
  const { clearCart } = useCart();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [orderId, setOrderId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const pending = sessionStorage.getItem('pps_pending_order');
    if (!pending || !token) {
      setStatus('error');
      setError('ไม่พบรายการชำระเงิน กรุณาลองใหม่อีกครั้ง');
      return;
    }

    setOrderId(pending);
    completePayment(pending, token)
      .then((result) => {
        sessionStorage.removeItem('pps_pending_order');
        if (result.status === 'successful') {
          setStatus('success');
          clearCart();
          trackEvent(AnalyticsEvents.PAYMENT_SUCCESS, {
            path: '/payment/return',
            itemId: Number(pending),
            itemTitle: 'order',
          });
        } else {
          setStatus('pending');
        }
      })
      .catch((err) => {
        setStatus('error');
        setError(err.message);
      });
  }, [token, clearCart]);

  return (
    <>
      <SEO title="ผลการชำระเงิน" />
      <section className="payment-return-section">
        <div className="container" style={{ maxWidth: 520, textAlign: 'center', padding: '80px 20px' }}>
          {status === 'loading' && (
            <>
              <div className="payment-spinner" style={{ width: 32, height: 32, margin: '0 auto 16px' }} />
              <h1>กำลังตรวจสอบการชำระเงิน...</h1>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="payment-success-icon" style={{ margin: '0 auto 16px' }}>✓</div>
              <h1>ชำระเงินสำเร็จ!</h1>
              <p>เลขที่คำสั่งซื้อ #{orderId}</p>
              <p>งานของคุณถูกสร้างแล้ว — ทำตามขั้นตอนด้านล่าง</p>
              <ProjectChecklist status="pending" depositPercent={100} fullyPaid={false} />
              <button
                type="button"
                className="btn-primary"
                style={{ marginTop: 24 }}
                onClick={() => navigate('/my-projects?welcome=1')}
              >
                ไปที่งานของฉัน
              </button>
            </>
          )}
          {status === 'pending' && (
            <>
              <h1>รอการยืนยันการชำระเงิน</h1>
              <p>หากชำระแล้ว ระบบจะอัปเดตภายในไม่กี่นาที</p>
              <Link to="/contact" className="btn-primary" style={{ marginTop: 24, display: 'inline-flex' }}>ติดต่อทีมงาน</Link>
            </>
          )}
          {status === 'error' && (
            <>
              <h1>ไม่สามารถยืนยันการชำระเงินได้</h1>
              <p>{error}</p>
              <Link to="/portfolio" className="btn-primary" style={{ marginTop: 24, display: 'inline-flex' }}>กลับไปเลือกบริการ</Link>
            </>
          )}
        </div>
      </section>
    </>
  );
}

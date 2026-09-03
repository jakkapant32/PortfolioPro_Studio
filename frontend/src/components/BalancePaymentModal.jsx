import { useState } from 'react';
import { payOrderBalance } from '../api/payment';

export default function BalancePaymentModal({ open, onClose, order, token, onPaymentReady }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const amountDue = order?.amount_due ?? 0;

  if (!open || !order) return null;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await payOrderBalance(order.id, {}, token);
      onPaymentReady?.({ ...result, token, balance_payment: true });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="payment-modal-overlay" onClick={onClose} />
      <div className="checkout-modal" role="dialog" aria-modal="true">
        <button type="button" className="payment-modal-close" onClick={onClose}>&times;</button>
        <div className="payment-modal-header">
          <h2>ชำระยอดคงเหลือ</h2>
          <p>ยอดที่ต้องโอน <strong>฿{Number(amountDue).toLocaleString()}</strong></p>
        </div>
        <div className="payment-info-banner">
          โอนเงินตามยอดคงเหลือ แล้วแนบสลิปให้แอดมินตรวจสอบ
        </div>
        {error && <div className="form-error">{error}</div>}
        <button type="button" className="btn-primary payment-close-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? 'กำลังดำเนินการ...' : `โอนยอดคงเหลือ ฿${Number(amountDue).toLocaleString()}`}
        </button>
      </div>
    </>
  );
}

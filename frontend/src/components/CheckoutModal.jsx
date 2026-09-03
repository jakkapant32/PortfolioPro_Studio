import { useEffect, useState } from 'react';
import { createPayment, getPaymentConfig } from '../api/payment';
import DepositSelector from './DepositSelector';
import { chargeAmount } from '../config/deposit';

export default function CheckoutModal({ open, onClose, cart, total, subtotal, discountAmount, couponCode, token, onPaymentReady }) {
  const [config, setConfig] = useState(null);
  const [depositPercent, setDepositPercent] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    getPaymentConfig()
      .then((data) => {
        setConfig(data);
        const firstValid = (data.deposit_options || []).find((o) => !o.disabled) || { percent: 100 };
        if (firstValid?.percent) setDepositPercent(firstValid.percent);
      })
      .catch((err) => setError(err.message));
  }, [open, total]);

  if (!open) return null;

  const payNow = chargeAmount(total, depositPercent);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await createPayment({
        items: cart,
        total,
        method: 'bank_transfer',
        deposit_percent: depositPercent,
        coupon_code: couponCode || undefined,
      }, token);
      onPaymentReady?.({ ...result, token });
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
        <button type="button" className="payment-modal-close" onClick={onClose} aria-label="ปิด">&times;</button>

        <div className="payment-modal-header">
          <h2>โอนเงินและแนบสลิป</h2>
          {discountAmount > 0 ? (
            <p>
              ยอดรวม ฿{subtotal.toLocaleString()} · ส่วนลด -฿{discountAmount.toLocaleString()}
              {' · '}ยอดชำระ <strong>฿{total.toLocaleString()}</strong>
            </p>
          ) : (
            <p>ยอดรวม ฿{total.toLocaleString()} · ชำระตอนนี้ <strong>฿{payNow.toLocaleString()}</strong></p>
          )}
        </div>

        <DepositSelector total={total} value={depositPercent} onChange={setDepositPercent} options={config?.deposit_options} omiseMin={0} />

        <div className="payment-info-banner">
          โอนเงินตามยอด แล้วอัปโหลดสลิปในขั้นตอนถัดไป — แอดมินจะตรวจสอบและยืนยันคำสั่งซื้อ
        </div>

        {error && <div className="form-error">{error}</div>}
        <button type="button" className="btn-primary payment-close-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? 'กำลังสร้างคำสั่งซื้อ...' : `ดำเนินการชำระ ฿${payNow.toLocaleString()}`}
        </button>
      </div>
    </>
  );
}

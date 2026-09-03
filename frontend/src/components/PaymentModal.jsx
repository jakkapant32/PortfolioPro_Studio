import { useEffect, useRef, useState } from 'react';
import { generatePromptPayQR } from '../utils/promptpay';
import { fetchPaymentSlip, getPaymentStatus, uploadPaymentSlip } from '../api/payment';
import { useSiteConfig } from '../hooks/useContent';
import ProjectChecklist from './ProjectChecklist';

export default function PaymentModal({ payment, onClose, onSuccess, onGoToProjects }) {
  const siteConfig = useSiteConfig();
  const [status, setStatus] = useState(payment?.status || 'awaiting_payment');
  const [error, setError] = useState(null);
  const [qrSrc, setQrSrc] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [hasSlip, setHasSlip] = useState(Boolean(payment?.has_slip));
  const [rejectReason, setRejectReason] = useState(payment?.reject_reason || '');
  const [slipSrc, setSlipSrc] = useState(null);
  const notifiedRef = useRef(false);

  const phone = payment?.promptpay_phone || siteConfig.promptPayPhone || siteConfig.phoneTel;
  const bankName = payment?.bank_name || siteConfig.bankName || 'พร้อมเพย์';
  const accountName = payment?.account_name || siteConfig.bankAccountName || siteConfig.name;
  const accountNumber = payment?.account_number || siteConfig.bankAccountNumber || phone;
  const payAmount = payment?.amount ?? payment?.charge_amount;

  useEffect(() => {
    if (!payment) return undefined;
    setStatus(payment.status || 'awaiting_payment');
    setHasSlip(Boolean(payment.has_slip));
    setRejectReason(payment.reject_reason || '');
    return undefined;
  }, [payment]);

  useEffect(() => {
    if (!payment?.order_id || !payment?.token || !hasSlip) return undefined;
    let objectUrl = null;
    let active = true;
    fetchPaymentSlip(payment.order_id, payment.token)
      .then((src) => {
        if (!active) return;
        objectUrl = src;
        setSlipSrc(src);
      })
      .catch(() => {});
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [payment?.order_id, payment?.token, hasSlip]);

  useEffect(() => {
    if (!phone || !payAmount) {
      setQrSrc(null);
      return undefined;
    }
    let active = true;
    generatePromptPayQR(phone, payAmount)
      .then((src) => {
        if (active) setQrSrc(src);
      })
      .catch(() => {
        if (active) setQrSrc(null);
      });
    return () => {
      active = false;
    };
  }, [phone, payAmount]);

  useEffect(() => {
    if (!payment?.order_id || !payment?.token) return undefined;
    let active = true;
    const poll = async () => {
      try {
        const result = await getPaymentStatus(payment.order_id, payment.token);
        if (!active) return;
        setStatus(result.status);
        setHasSlip(Boolean(result.has_slip));
        setRejectReason(result.reject_reason || '');
        if ((result.status === 'successful' || result.status === 'deposit_paid') && !notifiedRef.current) {
          notifiedRef.current = true;
          onSuccess?.(result);
        }
      } catch (err) {
        if (active) setError(err.message);
      }
    };
    poll();
    const timer = setInterval(poll, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [payment, onSuccess]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  if (!payment) return null;

  const isPaid = status === 'successful' || status === 'deposit_paid';
  const isDepositOnly = status === 'deposit_paid';
  const waitingReview = status === 'slip_submitted';
  const canUpload = status === 'awaiting_payment' || status === 'rejected' || status === 'slip_submitted';

  const handleFile = (e) => {
    const next = e.target.files?.[0];
    if (!next) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('กรุณาเลือกไฟล์สลิป');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const result = await uploadPaymentSlip(payment.order_id, file, payment.token);
      setStatus(result.status);
      setHasSlip(true);
      setRejectReason('');
      setFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const displaySlip = preview || slipSrc;

  return (
    <>
      <div className="payment-modal-overlay" onClick={onClose} />
      <div className="payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
        <button type="button" className="payment-modal-close" onClick={onClose} aria-label="ปิด">&times;</button>

        <div className="payment-modal-header">
          <div className="payment-modal-icon">
            <svg><use href="#icon-credit-card" /></svg>
          </div>
          <h2 id="payment-modal-title">
            {isPaid ? 'ยืนยันการชำระเงินแล้ว' : waitingReview ? 'รอแอดมินตรวจสอบสลิป' : 'โอนเงินแล้วแนบสลิป'}
          </h2>
          <p>
            {isPaid
              ? isDepositOnly
                ? `มัดจำ ${payment.deposit_percent || ''}% ได้รับการยืนยันแล้ว`
                : 'คำสั่งซื้อได้รับการยืนยันแล้ว'
              : waitingReview
                ? 'แอดมินกำลังตรวจสอบสลิปของคุณ'
                : 'โอนตามยอดด้านล่าง แล้วอัปโหลดสลิปเพื่อรอการยืนยัน'}
          </p>
        </div>

        {!isPaid && (
          <div className="payment-qr-wrap">
            {qrSrc && <img src={qrSrc} alt="PromptPay QR Code" className="payment-qr" />}
            <div className="payment-amount">ยอดโอน ฿{payAmount?.toLocaleString()}</div>
            <div className="bank-transfer-details">
              <p><strong>{bankName}</strong></p>
              <p>ชื่อบัญชี: {accountName}</p>
              <p>เลขบัญชี / พร้อมเพย์: {accountNumber}</p>
              <p>เลขที่คำสั่งซื้อ #{payment.order_id}</p>
            </div>
            {payment.total && payAmount !== payment.total && (
              <p className="payment-note">ยอดรวมโปรเจกต์ ฿{payment.total.toLocaleString()} · คงเหลือ ฿{(payment.amount_due ?? (payment.total - payAmount)).toLocaleString()}</p>
            )}
            {payment.sla_label && <p className="payment-note">{payment.sla_label}</p>}
          </div>
        )}

        {status === 'rejected' && (
          <div className="form-error" style={{ marginTop: 12 }}>
            สลิปไม่ผ่านการตรวจสอบ{rejectReason ? ` — ${rejectReason}` : ''} กรุณาโอนใหม่แล้วแนบสลิปอีกครั้ง
          </div>
        )}

        {canUpload && !isPaid && (
          <div className="slip-upload">
            <label className="slip-upload-label">
              แนบสลิปโอนเงิน (JPG, PNG, WEBP สูงสุด 5MB)
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} />
            </label>
            {displaySlip && (
              <img src={displaySlip} alt="สลิปโอนเงิน" className="slip-preview" />
            )}
            <button type="button" className="btn-primary payment-close-btn" onClick={handleUpload} disabled={uploading || !file}>
              {uploading ? 'กำลังส่งสลิป...' : waitingReview ? 'ส่งสลิปใหม่' : 'ส่งสลิปให้แอดมินตรวจสอบ'}
            </button>
          </div>
        )}

        {isPaid && (
          <div className="payment-success">
            <div className="payment-success-icon">✓</div>
            <p>เลขที่คำสั่งซื้อ #{payment.order_id}</p>
            <p>โอนเงิน · ฿{payAmount?.toLocaleString()}</p>
            <ProjectChecklist
              status="pending"
              depositPercent={payment.deposit_percent || 100}
              fullyPaid={payment.fully_paid ?? payment.status === 'successful'}
              compact
            />
          </div>
        )}

        {error && <div className="form-error" style={{ marginTop: 12 }}>{error}</div>}

        <button
          type="button"
          className="btn-primary payment-close-btn"
          onClick={isPaid ? onGoToProjects : onClose}
          style={canUpload && !isPaid ? { marginTop: 8, background: 'transparent', color: 'var(--text)', boxShadow: 'none' } : undefined}
        >
          {isPaid ? 'ไปที่งานของฉัน' : waitingReview ? 'ปิดหน้าต่าง (รอการยืนยัน)' : 'ปิด'}
        </button>
      </div>
    </>
  );
}

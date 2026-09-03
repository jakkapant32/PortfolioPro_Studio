import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useAuth } from '../context/AuthContext';
import { isLocalToken } from '../api/auth';
import { submitQuotation } from '../api/quotation';
import { validateCoupon } from '../api/coupon';
import CheckoutModal from './CheckoutModal';
import PaymentModal from './PaymentModal';
import { trackEvent, AnalyticsEvents } from '../utils/trackEvent';

export default function CartDrawer() {
  const { cart, isOpen, toggleCart, removeFromCart, clearCart, total } = useCart();
  const { requireAuth, isAuthenticated } = useRequireAuth();
  const { user, token, logout, openLoginModal } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [payment, setPayment] = useState(null);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const navigate = useNavigate();

  const payableTotal = appliedCoupon?.total ?? total;
  const discountAmount = appliedCoupon?.discount_amount ?? 0;

  const handleOpenCheckout = () => {
    if (cart.length === 0) {
      alert('กรุณาเลือกบริการลงในตะกร้าอย่างน้อย 1 รายการก่อนชำระเงินครับ');
      return;
    }
    if (!requireAuth()) return;
    if (isLocalToken(token)) {
      logout();
      openLoginModal('กรุณาเข้าสู่ระบบใหม่เพื่อชำระเงิน (เซิร์ฟเวอร์ไม่พร้อมตอนที่ login ครั้งก่อน)');
      return;
    }
    setCheckoutOpen(true);
    trackEvent(AnalyticsEvents.CHECKOUT_START, { path: '/cart' });
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    if (!token) {
      if (!requireAuth()) return;
    }
    setCouponLoading(true);
    setCouponError(null);
    try {
      const result = await validateCoupon(couponInput.trim(), total, token);
      setAppliedCoupon(result);
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err.message);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  const handlePaymentReady = (result) => {
    setPayment(result);
    setAppliedCoupon(null);
    setCouponInput('');
    toggleCart();
  };

  const handlePaymentSuccess = () => {
    clearCart();
    setAppliedCoupon(null);
    setCouponInput('');
  };

  const handleGoToProjects = () => {
    setPayment(null);
    navigate('/my-projects?welcome=1');
  };

  const handleQuotation = async () => {
    if (cart.length === 0) {
      alert('กรุณาเลือกบริการลงในตะกร้าอย่างน้อย 1 รายการก่อนส่งข้อมูลครับ');
      return;
    }
    if (!requireAuth()) return;

    setLoading(true);
    try {
      await submitQuotation({
        items: cart,
        total: payableTotal,
        source: 'cart',
        name: user?.name,
        email: user?.email,
      }, token);
      alert('ส่งข้อมูลสำเร็จ! ทีมงานจะติดต่อกลับเพื่อสรุปใบเสนอราคาโดยเร็วที่สุดครับ');
      clearCart();
      toggleCart();
      navigate('/contact');
    } catch {
      navigate('/contact', { state: { cart, total: payableTotal } });
      toggleCart();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`cart-overlay ${isOpen ? 'show' : ''}`} onClick={toggleCart} />
      <div className={`cart-drawer ${isOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h3>
            <svg className="icon" style={{ stroke: 'var(--text)', fill: 'none' }}><use href="#icon-cart" /></svg>
            รายการบริการที่เลือก
          </h3>
          <button className="cart-close" onClick={toggleCart}>&times;</button>
        </div>

        <div className="cart-items">
          {!isAuthenticated ? (
            <div className="cart-empty">
              <svg><use href="#icon-user" /></svg>
              <p>กรุณาเข้าสู่ระบบก่อนใช้งานตะกร้า</p>
              <button type="button" className="btn-primary" style={{ marginTop: 12, padding: '10px 20px' }} onClick={() => requireAuth()}>
                เข้าสู่ระบบ
              </button>
            </div>
          ) : cart.length === 0 ? (
            <div className="cart-empty">
              <svg><use href="#icon-cart" /></svg>
              <p>ไม่มีรายการในตะกร้าของคุณ</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-info">
                  <div className="cart-item-title">{item.title}</div>
                  <div className="cart-item-price">฿{item.price.toLocaleString()}</div>
                </div>
                <button className="cart-item-remove" onClick={() => removeFromCart(item.id)}>
                  <svg className="icon-sm" style={{ stroke: 'currentColor', fill: 'none', width: 14, height: 14 }}>
                    <use href="#icon-trash" />
                  </svg>
                  ลบออก
                </button>
              </div>
            ))
          )}
        </div>

        {isAuthenticated && cart.length > 0 && (
          <div className="cart-footer">
            {!appliedCoupon ? (
              <div className="cart-coupon">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="โค้ดส่วนลด"
                  aria-label="โค้ดส่วนลด"
                />
                <button type="button" className="cart-coupon-btn" onClick={handleApplyCoupon} disabled={couponLoading}>
                  {couponLoading ? '...' : 'ใช้โค้ด'}
                </button>
              </div>
            ) : (
              <div className="cart-coupon-applied">
                <span>ใช้โค้ด <strong>{appliedCoupon.code}</strong> แล้ว (-฿{discountAmount.toLocaleString()})</span>
                <button type="button" onClick={handleRemoveCoupon}>ลบ</button>
              </div>
            )}
            {couponError && <div className="cart-coupon-error">{couponError}</div>}

            <div className="cart-total-row">
              <span className="cart-total-label">ยอดรวม:</span>
              <span className="cart-total-price">฿{total.toLocaleString()}</span>
            </div>
            {discountAmount > 0 && (
              <div className="cart-total-row cart-discount-row">
                <span className="cart-total-label">ส่วนลด:</span>
                <span className="cart-discount-price">-฿{discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="cart-total-row cart-payable-row">
              <span className="cart-total-label">ยอดชำระ:</span>
              <span className="cart-total-price">฿{payableTotal.toLocaleString()}</span>
            </div>
            <button className="btn-checkout" onClick={handleOpenCheckout} disabled={loading}>
              ชำระเงิน
              <svg className="icon-sm" style={{ stroke: 'white', fill: 'none' }}><use href="#icon-arrow-right" /></svg>
            </button>
            <button type="button" className="btn-quotation-link" onClick={handleQuotation} disabled={loading}>
              ขอใบเสนอราคาแทน (ไม่ชำระตอนนี้)
            </button>
          </div>
        )}
      </div>

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cart={cart}
        total={payableTotal}
        subtotal={total}
        discountAmount={discountAmount}
        couponCode={appliedCoupon?.code || ''}
        token={token}
        user={user}
        onPaymentReady={handlePaymentReady}
      />

      <PaymentModal
        payment={payment}
        onClose={() => setPayment(null)}
        onSuccess={handlePaymentSuccess}
        onGoToProjects={handleGoToProjects}
      />
    </>
  );
}

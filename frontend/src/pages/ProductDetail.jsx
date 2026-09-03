import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import { useCart } from '../context/CartContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { usePortfolioItem } from '../hooks/useContent';
import { trackEvent, AnalyticsEvents } from '../utils/trackEvent';

export default function ProductDetail() {
  const { slug } = useParams();
  const { cart, addToCart } = useCart();
  const { requireAuth } = useRequireAuth();
  const product = usePortfolioItem(slug);

  useEffect(() => {
    if (product) {
      trackEvent(AnalyticsEvents.PRODUCT_VIEW, {
        path: `/portfolio/${product.slug}`,
        itemId: product.id,
        itemTitle: product.title,
      });
    }
  }, [product?.id]);

  if (!product) {
    return (
      <div className="container product-detail">
        <h1>ไม่พบสินค้า</h1>
        <Link to="/portfolio" className="btn-primary" style={{ marginTop: 24, display: 'inline-flex' }}>
          กลับไปคลังผลงาน
        </Link>
      </div>
    );
  }

  const handleAdd = () => {
    requireAuth(() => {
      if (cart.find((i) => i.id === product.id)) {
        alert('คุณได้เลือกบริการแพ็กเกจชิ้นนี้ลงตะกร้าเรียบร้อยแล้วครับ');
        return;
      }
      addToCart(product);
    });
  };

  return (
    <>
      <SEO title={product.title} description={product.description} />

      <div className="product-detail">
        <div className="container">
          <Link to="/portfolio" className="product-back">
            <svg className="icon-sm" style={{ stroke: 'currentColor', fill: 'none' }}><use href="#icon-arrow-right" /></svg>
            กลับไปคลังผลงาน
          </Link>

          <div className="product-detail-grid">
            <div className="product-detail-image">
              <img src={product.image} alt={product.title} />
            </div>

            <div className="product-detail-content">
              <span className="portfolio-tag">
                <svg><use href="#icon-tag" /></svg>
                {product.tag}
              </span>
              <h1>{product.title}</h1>
              <p className="product-detail-desc">{product.description}</p>

              <div className="product-detail-meta">
                <div className="product-meta-item">
                  <span className="product-meta-label">ราคาเริ่มต้น</span>
                  <span className="product-detail-price">฿{product.price.toLocaleString()}</span>
                </div>
                <div className="product-meta-item">
                  <span className="product-meta-label">ระยะเวลาพัฒนา</span>
                  <span className="product-meta-value">{product.deliveryTime}</span>
                </div>
              </div>

              <h3 className="product-features-title">สิ่งที่ได้รับ</h3>
              <ul className="product-features">
                {product.features.map((feature) => (
                  <li key={feature}>
                    <svg className="icon-sm" style={{ stroke: 'var(--primary)', fill: 'none' }}><use href="#icon-check" /></svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="product-detail-actions">
                <button type="button" className="btn-primary" onClick={handleAdd}>
                  <svg className="icon-sm" style={{ stroke: 'white', fill: 'none' }}><use href="#icon-cart" /></svg>
                  เพิ่มลงตะกร้า
                </button>
                <Link to="/contact" className="btn-secondary">ปรึกษาฟรี</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

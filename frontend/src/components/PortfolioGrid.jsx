import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function PortfolioGrid({ items, useImages = true, compact = true }) {
  const { cart, addToCart } = useCart();
  const { requireAuth } = useRequireAuth();

  const handleAdd = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    requireAuth(() => {
      if (cart.find((i) => i.id === item.id)) {
        alert('คุณได้เลือกบริการแพ็กเกจชิ้นนี้ลงตะกร้าเรียบร้อยแล้วครับ');
        return;
      }
      addToCart(item);
    });
  };

  return (
    <div className={`portfolio-grid ${compact ? 'portfolio-grid-compact' : ''}`}>
      {items.map((item) => (
        <Link
          key={item.id}
          to={`/portfolio/${item.slug}`}
          className="portfolio-item portfolio-item-link"
        >
          <div className="portfolio-img-wrap">
            <div
              className={`portfolio-img ${!useImages ? 'gradient' : ''}`}
              style={!useImages ? { background: item.gradient } : undefined}
            >
              {useImages ? (
                <img src={item.image} alt={item.title} loading="lazy" />
              ) : (
                <svg><use href="#icon-monitor" /></svg>
              )}
            </div>
            <div className="portfolio-info portfolio-info-compact">
              <span className="portfolio-tag">
                <svg><use href="#icon-tag" /></svg>
                {item.tag}
              </span>
              <h3>{item.title}</h3>
            </div>
          </div>
          <div className="portfolio-info portfolio-info-compact" style={{ paddingTop: 0 }}>
            <div className="portfolio-buy-row">
              <span className="portfolio-price">฿{item.price.toLocaleString()}</span>
              <button
                type="button"
                className="btn-add-cart btn-add-cart-sm"
                onClick={(e) => handleAdd(e, item)}
                aria-label={`เพิ่ม ${item.title} ลงตะกร้า`}
              >
                <svg className="icon-sm" style={{ stroke: 'currentColor', fill: 'none' }}>
                  <use href="#icon-cart" />
                </svg>
              </button>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

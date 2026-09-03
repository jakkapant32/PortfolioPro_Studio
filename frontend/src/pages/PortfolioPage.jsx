import { useState, useMemo, useEffect } from 'react';
import SEO from '../components/SEO';
import PortfolioGrid from '../components/PortfolioGrid';
import { usePortfolio } from '../hooks/useContent';
import { categoryFilters } from '../data/portfolio';
import { trackEvent, AnalyticsEvents } from '../utils/trackEvent';

export default function PortfolioPage() {
  const portfolioItems = usePortfolio();
  const [activeFilter, setActiveFilter] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    trackEvent(AnalyticsEvents.PORTFOLIO_VIEW, { path: '/portfolio' });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return portfolioItems.filter((item) => {
      if (activeFilter !== 'all' && item.category !== activeFilter) return false;
      if (!q) return true;
      const haystack = [
        item.title,
        item.description,
        item.tag,
        item.category,
        ...(item.features || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [portfolioItems, activeFilter, query]);

  return (
    <>
      <SEO
        title="คลังผลงานและแพ็กเกจบริการ"
        description="เลือกชมตัวอย่างผลงานระบบระดับพรีเมียม Portfolio Website, Corporate Website และ Business System"
        keywords="รับทำเว็บไซต์องค์กร, พัฒนาเว็บด้วย Golang, เว็บ Portfolio โปรแกรมเมอร์"
      />

      <header className="page-header">
        <div className="container">
          <div className="section-label">
            <svg><use href="#icon-palette" /></svg>
            Service Packages
          </div>
          <h1 className="page-title">คลังผลงานและแพ็กเกจบริการ</h1>
          <p className="page-desc">
            คลิกดูรายละเอียดแต่ละแพ็กเกจ หรือเพิ่มลงตะกร้าเพื่อขอใบเสนอราคา
          </p>
          <div className="portfolio-toolbar">
            <div className="category-filters">
              {categoryFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  className={`filter-btn ${activeFilter === filter.key ? 'active' : ''}`}
                  onClick={() => setActiveFilter(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <label className="portfolio-search">
              <svg aria-hidden="true"><use href="#icon-eye" /></svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาแพ็กเกจ เช่น portfolio, CRM, ร้านค้า..."
                aria-label="ค้นหาแพ็กเกจ"
              />
            </label>
          </div>
        </div>
      </header>

      <section className="portfolio-section">
        <div className="container">
          {filtered.length === 0 ? (
            <p className="portfolio-empty">ไม่พบแพ็กเกจที่ตรงกับคำค้นหา ลองเปลี่ยนคำหรือหมวดหมู่</p>
          ) : (
            <PortfolioGrid items={filtered} useImages />
          )}
        </div>
      </section>
    </>
  );
}

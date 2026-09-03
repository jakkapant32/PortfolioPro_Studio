import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../../components/SEO';
import { useAuth } from '../../context/AuthContext';

export default function AdminLanding() {
  const { loading, isAuthenticated, user, openAdminLoginModal } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated && user?.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [loading, isAuthenticated, user, navigate]);

  const handleLogin = () => openAdminLoginModal();

  return (
    <>
      <SEO
        title="Admin Panel"
        description="ระบบจัดการหลังบ้าน PortfolioPro Studio"
        path="/admin"
      />

      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-content">
            <div className="hero-badge">
              <svg><use href="#icon-settings" /></svg>
              PortfolioPro Admin Panel
            </div>
            <h1>จัดการ <span>เว็บไซต์</span><br />ได้ในที่เดียว</h1>
            <p className="hero-desc">
              ดูแลคำสั่งซื้อ ข้อความติดต่อ ใบเสนอราคา แพ็กเกจบริการ บทความ
              และตั้งค่าเว็บไซต์ — สำหรับทีมงาน Admin เท่านั้น
            </p>
            <div className="hero-buttons">
              <button type="button" className="btn-primary" onClick={handleLogin}>
                เข้าสู่ระบบ Admin
                <svg className="icon-sm" style={{ stroke: 'white', fill: 'none' }}><use href="#icon-arrow-right" /></svg>
              </button>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-mockup">
              <div className="mockup-header">
                <div className="mockup-dot red" />
                <div className="mockup-dot yellow" />
                <div className="mockup-dot green" />
              </div>
              <div className="mockup-content">
                <div className="mockup-avatar">
                  <svg><use href="#icon-layout-dashboard" /></svg>
                </div>
                <div className="mockup-line" />
                <div className="mockup-line short" />
                <div className="mockup-line shorter" />
                <div className="mockup-cards">
                  <div className="mockup-card"><svg><use href="#icon-credit-card" /></svg></div>
                  <div className="mockup-card"><svg><use href="#icon-mail" /></svg></div>
                </div>
              </div>
            </div>
            <div className="floating-card card-1">
              <div className="floating-card-icon">
                <svg style={{ stroke: 'var(--primary)', strokeWidth: 2.5, fill: 'none' }}><use href="#icon-credit-card" /></svg>
              </div>
              <div>
                <div className="floating-card-text">คำสั่งซื้อ</div>
                <div className="floating-card-sub">โอนเงิน · ตรวจสลิป</div>
              </div>
            </div>
            <div className="floating-card card-2">
              <div className="floating-card-icon">
                <svg style={{ stroke: 'var(--primary)', fill: 'var(--primary)' }}><use href="#icon-briefcase" /></svg>
              </div>
              <div>
                <div className="floating-card-text">จัดการเนื้อหา</div>
                <div className="floating-card-sub">Portfolio · Blog</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="services" id="admin-features">
        <div className="container">
          <div className="section-header">
            <div className="section-label">
              <svg><use href="#icon-zap" /></svg>
              ฟีเจอร์หลังบ้าน
            </div>
            <h2 className="section-title">ครบทุกงานที่ Admin ต้องดูแล</h2>
            <p className="section-desc">
              เข้าสู่ระบบเพื่อจัดการข้อมูลทั้งหมดของ PortfolioPro Studio
            </p>
          </div>
          <div className="services-grid">
            <div className="service-card">
              <div className="service-icon"><svg style={{ stroke: 'white', fill: 'none' }}><use href="#icon-credit-card" /></svg></div>
              <h3>คำสั่งซื้อ & ชำระเงิน</h3>
              <p>ดูสลิปโอนเงิน ยืนยันหรือปฏิเสธคำสั่งซื้อของลูกค้า</p>
            </div>
            <div className="service-card">
              <div className="service-icon"><svg style={{ stroke: 'white', fill: 'none' }}><use href="#icon-mail" /></svg></div>
              <h3>ติดต่อ & ใบเสนอราคา</h3>
              <p>ตอบข้อความจากฟอร์ม Contact และจัดการคำขอใบเสนอราคาจากตะกร้า</p>
            </div>
            <div className="service-card">
              <div className="service-icon"><svg style={{ stroke: 'white', fill: 'none' }}><use href="#icon-settings" /></svg></div>
              <h3>เนื้อหา & ตั้งค่าเว็บ</h3>
              <p>แก้ไขแพ็กเกจบริการ บทความ Blog และข้อมูลติดต่อบนหน้าเว็บ</p>
            </div>
          </div>
        </div>
      </section>

      <section className="stats">
        <div className="container">
          <div className="stats-grid">
            <div><div className="stat-number">8</div><div className="stat-label">เมนูจัดการ</div></div>
            <div><div className="stat-number">CMS</div><div className="stat-label">Portfolio · Blog · Settings</div></div>
            <div><div className="stat-number">Real-time</div><div className="stat-label">สถานะชำระเงิน</div></div>
            <div><div className="stat-number">Secure</div><div className="stat-label">Admin เท่านั้น</div></div>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container">
          <h2>พร้อมเข้าสู่ระบบหลังบ้าน?</h2>
          <p>ใช้บัญชี Admin ที่ได้รับอนุญาตเพื่อเข้าจัดการเว็บไซต์</p>
          <button type="button" className="btn-primary" onClick={handleLogin}>
            เข้าสู่ระบบ Admin
            <svg className="icon-sm" style={{ stroke: 'var(--primary)', fill: 'none' }}><use href="#icon-arrow-right" /></svg>
          </button>
        </div>
      </section>
    </>
  );
}

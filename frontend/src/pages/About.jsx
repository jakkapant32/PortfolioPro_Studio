import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

export default function About() {
  return (
    <>
      <SEO
        title="เกี่ยวกับเรา"
        description="PortfolioPro Studio ธุรกิจรับออกแบบและพัฒนาเว็บไซต์ Portfolio และระบบสำหรับองค์กร สร้างภาพลักษณ์ดิจิทัล เพิ่มโอกาสทางอาชีพ"
      />

      <header className="page-header">
        <div className="container">
          <div className="section-label">
            <svg><use href="#icon-globe" /></svg>
            About Us
          </div>
          <h1 className="page-title">เกี่ยวกับ PortfolioPro Studio</h1>
          <p className="page-desc">
            สร้างภาพลักษณ์ดิจิทัล เพิ่มโอกาสทางอาชีพ และยกระดับองค์กรสู่ยุคออนไลน์
          </p>
        </div>
      </header>

      <section className="about-section">
        <div className="container about-grid">
          <div className="about-content">
            <h2>แนวคิดธุรกิจของเรา</h2>
            <p>
              ในยุคดิจิทัลปัจจุบัน การสมัครงานไม่ควรพึ่งพาเพียง Resume หรือเอกสาร PDF แบบเดิมอีกต่อไป
              เพราะนายจ้างต้องการเห็นผลงาน ความสามารถ และตัวตนของผู้สมัครงานได้อย่างชัดเจน
            </p>
            <p>
              PortfolioPro Studio จึงเป็นธุรกิจรับออกแบบและพัฒนาเว็บไซต์ Portfolio ส่วนบุคคล
              เพื่อช่วยให้นักศึกษา คนหางาน และบุคลากรสายอาชีพ สามารถนำเสนอผลงาน ประสบการณ์
              และทักษะของตนเองผ่านเว็บไซต์ที่ดูเป็นมืออาชีพ
            </p>
            <p>
              นอกจากนี้ยังขยายบริการไปสู่เว็บไซต์องค์กร ระบบเช่ารถออนไลน์ ระบบบริหารฝ่ายขาย
              และระบบจัดการข้อมูลภายในองค์กร
            </p>
            <div className="tech-stack">
              <span className="tech-badge">React</span>
              <span className="tech-badge">Golang</span>
              <span className="tech-badge">PostgreSQL</span>
              <span className="tech-badge">Vercel</span>
              <span className="tech-badge">Render.com</span>
            </div>
          </div>
          <div className="about-features">
            <div className="about-feature">
              <h4><svg className="icon-sm" style={{ stroke: 'var(--primary)', fill: 'none' }}><use href="#icon-target" /></svg>กลุ่มเป้าหมายหลัก</h4>
              <p>นักศึกษาและคนหางาน อายุ 18-30 ปี ที่ต้องการ Portfolio มืออาชีพ</p>
            </div>
            <div className="about-feature">
              <h4><svg className="icon-sm" style={{ stroke: 'var(--primary)', fill: 'none' }}><use href="#icon-building" /></svg>กลุ่มเป้าหมายรอง</h4>
              <p>เจ้าของธุรกิจ SME ที่ต้องการเว็บไซต์องค์กรและระบบจัดการงาน</p>
            </div>
            <div className="about-feature">
              <h4><svg className="icon-sm" style={{ stroke: 'var(--primary)', fill: 'none' }}><use href="#icon-code" /></svg>Custom Development</h4>
              <p>พัฒนาแบบ Custom 100% ไม่ใช้ CMS สำเร็จรูป เพื่อความยืดหยุ่นสูงสุด</p>
            </div>
            <div className="about-feature">
              <h4><svg className="icon-sm" style={{ stroke: 'var(--primary)', fill: 'none' }}><use href="#icon-zap" /></svg>ประสิทธิภาพสูง</h4>
              <p>โหลดเร็ว รองรับการขยายระบบในอนาคต ปรับแต่งตามความต้องการลูกค้า</p>
            </div>
          </div>
        </div>
      </section>

      <section className="values-section">
        <div className="container">
          <div className="section-header">
            <div className="section-label">
              <svg><use href="#icon-star" /></svg>
              คุณค่าของเรา
            </div>
            <h2 className="section-title">ทำไมต้องเลือกเรา</h2>
          </div>
          <div className="values-grid">
            <div className="value-card">
              <div className="service-icon" style={{ margin: '0 auto' }}>
                <svg style={{ stroke: 'white', fill: 'none' }}><use href="#icon-eye" /></svg>
              </div>
              <h3>แสดงผลงานทันที</h3>
              <p>ออกแบบ UX ที่ช่วยลด Bounce Rate แสดงผลงานและ CTA ชัดเจนตั้งแต่วินาทีแรก</p>
            </div>
            <div className="value-card">
              <div className="service-icon" style={{ margin: '0 auto' }}>
                <svg style={{ stroke: 'white', fill: 'none' }}><use href="#icon-globe" /></svg>
              </div>
              <h3>SEO ที่แข็งแกร่ง</h3>
              <p>ปรับ On-Page SEO ครบถ้วน ช่วยให้ลูกค้าเป้าหมายค้นหาเจอได้ง่าย</p>
            </div>
            <div className="value-card">
              <div className="service-icon" style={{ margin: '0 auto' }}>
                <svg style={{ stroke: 'white', fill: 'none' }}><use href="#icon-check" /></svg>
              </div>
              <h3>ปรึกษาฟรี</h3>
              <p>รับคำปรึกษาและใบเสนอราคาก่อนตัดสินใจ ไม่มีค่าใช้จ่ายล่วงหน้า</p>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <Link to="/contact" className="btn-primary">
              ติดต่อปรึกษาเรา
              <svg className="icon-sm" style={{ stroke: 'white', fill: 'none' }}><use href="#icon-arrow-right" /></svg>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

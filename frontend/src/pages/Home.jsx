import { Link } from 'react-router-dom';

import SEO from '../components/SEO';

import HeroCarousel from '../components/HeroCarousel';

import PortfolioGrid from '../components/PortfolioGrid';

import { usePortfolio } from '../hooks/useContent';



export default function Home() {

  const portfolioItems = usePortfolio();

  return (

    <>

      <SEO

        title="รับทำ Portfolio Website"

        description="บริการรับออกแบบ Portfolio Website และเว็บไซต์องค์กร เพิ่มโอกาสในการสมัครงานและสร้างภาพลักษณ์ดิจิทัล"

        keywords="รับทำ Portfolio Website, เว็บไซต์สมัครงาน, เว็บ Portfolio นักศึกษา, Website Developer Thailand"

      />



      <HeroCarousel />



      <section className="services" id="services">

        <div className="container">

          <div className="section-header">

            <div className="section-label">

              <svg><use href="#icon-zap" /></svg>

              บริการของเรา

            </div>

            <h2 className="section-title">ครบวงจร ตั้งแต่ Portfolio ถึงระบบองค์กร</h2>

            <p className="section-desc">

              เลือกบริการที่ตอบโจทย์ความต้องการของคุณ ด้วยเทคโนโลยีที่ทันสมัยและทีมงานมืออาชีพ

            </p>

          </div>

          <div className="services-grid">

            <div className="service-card">

              <div className="service-icon"><svg style={{ stroke: 'white', fill: 'none' }}><use href="#icon-briefcase" /></svg></div>

              <h3>Portfolio Website</h3>

              <p>เว็บไซต์ Portfolio ส่วนบุคคล โชว์ผลงาน ทักษะ และประสบการณ์ สร้าง Personal Branding ที่โดดเด่น</p>

            </div>

            <div className="service-card">

              <div className="service-icon"><svg style={{ stroke: 'white', fill: 'none' }}><use href="#icon-building" /></svg></div>

              <h3>Corporate Website</h3>

              <p>เว็บไซต์องค์กรที่ดูเป็นมืออาชีพ เพิ่มความน่าเชื่อถือ และสร้างภาพลักษณ์ที่ดีให้ธุรกิจของคุณ</p>

            </div>

            <div className="service-card">

              <div className="service-icon"><svg style={{ stroke: 'white', fill: 'none' }}><use href="#icon-settings" /></svg></div>

              <h3>Business System</h3>

              <p>ระบบจัดการฝ่ายขาย ระบบเช่ารถออนไลน์ และระบบจัดการข้อมูลภายในองค์กร แบบ Custom Development</p>

            </div>

          </div>

        </div>

      </section>



      <section className="portfolio" id="portfolio">

        <div className="container">

          <div className="section-header">

            <div className="section-label">

              <svg><use href="#icon-palette" /></svg>

              คลังบริการของเรา

            </div>

            <h2 className="section-title">เลือกแพ็กเกจที่คุณต้องการ</h2>

            <p className="section-desc">

              คลิกดูรายละเอียดแต่ละแพ็กเกจ หรือเพิ่มลงตะกร้าเพื่อขอใบเสนอราคา

            </p>

          </div>

          <PortfolioGrid items={portfolioItems} useImages />

          <div style={{ textAlign: 'center', marginTop: 40 }}>

            <Link to="/portfolio" className="btn-primary">

              ดูผลงานทั้งหมด

              <svg className="icon-sm" style={{ stroke: 'white', fill: 'none' }}><use href="#icon-arrow-right" /></svg>

            </Link>

          </div>

        </div>

      </section>



      <section className="stats">

        <div className="container">

          <div className="stats-grid">

            <div><div className="stat-number">150+</div><div className="stat-label">โปรเจกต์สำเร็จ</div></div>

            <div><div className="stat-number">98%</div><div className="stat-label">ลูกค้าพึงพอใจ</div></div>

            <div><div className="stat-number">3 วัน</div><div className="stat-label">เฉลี่ยต่อโปรเจกต์</div></div>

            <div><div className="stat-number">24/7</div><div className="stat-label">สนับสนุนลูกค้า</div></div>

          </div>

        </div>

      </section>



      <section className="cta">

        <div className="container">

          <h2>พร้อมสร้างภาพลักษณ์ดิจิทัลของคุณ?</h2>

          <p>ติดต่อเราวันนี้เพื่อรับคำปรึกษาฟรี และใบเสนอราคาที่เหมาะสมกับความต้องการของคุณ</p>

          <Link to="/contact" className="btn-primary">

            ปรึกษาฟรี

            <svg className="icon-sm" style={{ stroke: 'var(--primary)', fill: 'none' }}><use href="#icon-arrow-right" /></svg>

          </Link>

        </div>

      </section>

    </>

  );

}


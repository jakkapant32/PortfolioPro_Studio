import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import SEO from '../components/SEO';
import { submitContact } from '../api/quotation';
import { useSiteConfig } from '../hooks/useContent';

export default function Contact() {
  const siteConfig = useSiteConfig();
  const location = useLocation();
  const cartFromState = location.state?.cart || [];
  const totalFromState = location.state?.total || 0;

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    message: cartFromState.length
      ? `สนใจบริการ: ${cartFromState.map((i) => i.title).join(', ')} (ประมาณการ ฿${totalFromState.toLocaleString()})`
      : '',
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      await submitContact({
        ...form,
        items: cartFromState,
        total: totalFromState,
      });
      setStatus('success');
      setForm({ name: '', email: '', phone: '', service: '', message: '' });
    } catch {
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="ติดต่อเรา - ขอใบเสนอราคา"
        description="ติดต่อ PortfolioPro Studio เพื่อรับคำปรึกษาฟรีและขอใบเสนอราคาสำหรับ Portfolio Website หรือระบบองค์กร"
      />

      <header className="page-header">
        <div className="container">
          <div className="section-label">
            <svg><use href="#icon-mail" /></svg>
            Contact Us
          </div>
          <h1 className="page-title">ติดต่อเรา</h1>
          <p className="page-desc">
            สอบถามข้อมูลเพิ่มเติม ขอใบเสนอราคา หรือปรึกษาโปรเจกต์ของคุณได้ที่นี่
          </p>
        </div>
      </header>

      <section className="contact-section">
        <div className="container contact-grid">
          <div className="contact-info">
            <h2>พร้อมเริ่มโปรเจกต์ของคุณ?</h2>
            <p>
              กรอกแบบฟอร์มด้านขวา หรือติดต่อเราผ่านช่องทางด้านล่าง
              ทีมงานจะติดต่อกลับภายใน 24 ชั่วโมง
            </p>

            <div className="contact-item">
              <div className="contact-item-icon">
                <svg><use href="#icon-mail" /></svg>
              </div>
              <div>
                <h4>อีเมล</h4>
                <p><a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a></p>
              </div>
            </div>
            <div className="contact-item">
              <div className="contact-item-icon">
                <svg><use href="#icon-message" /></svg>
              </div>
              <div>
                <h4>Line OA</h4>
                <p><a href={siteConfig.lineUrl} target="_blank" rel="noopener noreferrer">{siteConfig.lineId}</a></p>
              </div>
            </div>
            <div className="contact-item">
              <div className="contact-item-icon">
                <svg><use href="#icon-phone" /></svg>
              </div>
              <div>
                <h4>โทรศัพท์</h4>
                <p><a href={`tel:${siteConfig.phoneTel}`}>{siteConfig.phone}</a> ({siteConfig.phoneHours})</p>
              </div>
            </div>
          </div>

          <div className="contact-form">
            <h3>แบบฟอร์มขอใบเสนอราคา</h3>

            {status === 'success' && (
              <div className="form-success">
                ส่งข้อมูลสำเร็จ! ทีมงานจะติดต่อกลับโดยเร็วที่สุดครับ ขอบคุณที่ไว้วางใจ
              </div>
            )}
            {status === 'error' && (
              <div className="form-error">
                ไม่สามารถส่งข้อมูลได้ในขณะนี้ กรุณาลองใหม่หรือติดต่อทาง Line OA
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">ชื่อ-นามสกุล *</label>
                  <input type="text" id="name" name="name" value={form.name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="phone">เบอร์โทรศัพท์ *</label>
                  <input type="tel" id="phone" name="phone" value={form.phone} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="email">อีเมล *</label>
                <input type="email" id="email" name="email" value={form.email} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="service">ประเภทบริการที่สนใจ</label>
                <select id="service" name="service" value={form.service} onChange={handleChange}>
                  <option value="">-- เลือกบริการ --</option>
                  <option value="portfolio">Portfolio Website</option>
                  <option value="corporate">Corporate Website</option>
                  <option value="crm">ระบบบริหารฝ่ายขาย (CRM)</option>
                  <option value="rental">ระบบเช่ารถออนไลน์</option>
                  <option value="other">อื่นๆ</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="message">รายละเอียดเพิ่มเติม</label>
                <textarea id="message" name="message" value={form.message} onChange={handleChange} placeholder="บอกเราเกี่ยวกับโปรเจกต์ของคุณ..." />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                {loading ? 'กำลังส่ง...' : 'ส่งข้อมูลขอใบเสนอราคา'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}

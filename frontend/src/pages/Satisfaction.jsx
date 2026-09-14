import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';
import { submitSatisfaction } from '../api/satisfaction';

const SERVICE_OPTIONS = [
  { value: '', label: '-- เลือกบริการ --' },
  { value: 'portfolio', label: 'Portfolio Website' },
  { value: 'corporate', label: 'Corporate Website' },
  { value: 'crm', label: 'ระบบบริหารฝ่ายขาย (CRM)' },
  { value: 'rental', label: 'ระบบเช่ารถออนไลน์' },
  { value: 'other', label: 'อื่นๆ' },
];

function StarPicker({ value, onChange, label }) {
  return (
    <div className="satisfaction-stars">
      <span className="satisfaction-stars-label">{label}</span>
      <div className="satisfaction-stars-row" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`satisfaction-star-btn ${value >= n ? 'active' : ''}`}
            onClick={() => onChange(n)}
            aria-label={`${n} ดาว`}
            aria-pressed={value >= n}
          >
            <svg><use href="#icon-star" /></svg>
          </button>
        ))}
        <span className="satisfaction-stars-hint">{value ? `${value}/5` : 'เลือกคะแนน'}</span>
      </div>
    </div>
  );
}

export default function Satisfaction() {
  const { user, token } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    service: '',
    rating: 0,
    comment: '',
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.rating < 1) {
      setStatus('rating');
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      await submitSatisfaction(form, token);
      setStatus('success');
      setForm((prev) => ({
        ...prev,
        service: '',
        rating: 0,
        comment: '',
      }));
    } catch {
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="ประเมินความพึงพอใจ"
        description="แบบประเมินความพึงพอใจต่อบริการ PortfolioPro Studio ช่วยให้เราพัฒนาบริการได้ดียิ่งขึ้น"
        keywords="ประเมินความพึงพอใจ, รีวิว, PortfolioPro Studio"
      />

      <header className="page-header">
        <div className="container">
          <div className="section-label">
            <svg><use href="#icon-star" /></svg>
            Satisfaction Survey
          </div>
          <h1 className="page-title">ประเมินความพึงพอใจ</h1>
          <p className="page-desc">
            ความคิดเห็นของคุณมีค่าต่อเรา ใช้เวลาไม่กี่นาทีเพื่อช่วยให้ทีมพัฒนาบริการได้ดียิ่งขึ้น
          </p>
        </div>
      </header>

      <section className="contact-section">
        <div className="container satisfaction-layout">
          <div className="contact-info">
            <h2>ทำไมต้องประเมิน?</h2>
            <p>
              เราใช้ผลประเมินเพื่อปรับปรุงคุณภาพงาน การสื่อสาร และประสบการณ์ลูกค้า
              ข้อมูลจะถูกเก็บเป็นความลับและใช้เพื่อพัฒนาบริการเท่านั้น
            </p>
            <ul className="satisfaction-bullets">
              <li>ให้คะแนนความพึงพอใจ 1–5 ดาว</li>
              <li>เลือกบริการที่คุณใช้ (ถ้ามี)</li>
              <li>แนะนำสิ่งที่อยากให้เราปรับปรุง (ไม่บังคับ)</li>
            </ul>
            <p className="satisfaction-note">
              มีข้อสงสัยเรื่องโปรเจกต? <Link to="/contact">ติดต่อเรา</Link> หรือดู <Link to="/faq">FAQ</Link>
            </p>
          </div>

          <div className="contact-form satisfaction-form">
            <h3>แบบฟอร์มประเมิน</h3>

            {status === 'success' && (
              <div className="form-success">
                ขอบคุณสำหรับการประเมิน! เราได้รับข้อมูลแล้วและจะนำไปปรับปรุงบริการต่อไป
              </div>
            )}
            {status === 'error' && (
              <div className="form-error">
                ไม่สามารถส่งแบบประเมินได้ในขณะนี้ กรุณาลองใหม่ภายหลัง
              </div>
            )}
            {status === 'rating' && (
              <div className="form-error">กรุณาเลือกคะแนนความพึงพอใจ (1–5 ดาว)</div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="sat-name">ชื่อ-นามสกุล *</label>
                  <input
                    type="text"
                    id="sat-name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="sat-email">อีเมล *</label>
                  <input
                    type="email"
                    id="sat-email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="sat-service">บริการที่ใช้</label>
                <select id="sat-service" name="service" value={form.service} onChange={handleChange}>
                  {SERVICE_OPTIONS.map((opt) => (
                    <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <StarPicker
                label="ความพึงพอใจโดยรวม *"
                value={form.rating}
                onChange={(n) => {
                  setForm({ ...form, rating: n });
                  setStatus(null);
                }}
              />

              <div className="form-group">
                <label htmlFor="sat-comment">ข้อเสนอแนะเพิ่มเติม</label>
                <textarea
                  id="sat-comment"
                  name="comment"
                  value={form.comment}
                  onChange={handleChange}
                  placeholder="สิ่งที่ประทับใจ หรืออยากให้ปรับปรุง..."
                />
              </div>

              <button
                type="submit"
                className="btn-primary satisfaction-submit"
                disabled={loading}
              >
                {loading ? 'กำลังส่ง...' : 'ส่งแบบประเมิน'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}

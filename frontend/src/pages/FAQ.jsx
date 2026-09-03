import { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const faqGroups = [
  {
    title: 'บริการและแพ็กเกจ',
    items: [
      {
        q: 'PortfolioPro Studio รับทำอะไรบ้าง?',
        a: 'เรารับออกแบบและพัฒนา Portfolio Website, Corporate Website และระบบธุรกิจ เช่น CRM, E-commerce, LMS โดยเลือกแพ็กเกจได้จากหน้าคลังผลงาน',
      },
      {
        q: 'ใช้เวลานานแค่ไหนกว่าจะได้เว็บ?',
        a: 'ขึ้นกับแพ็กเกจ โดยทั่วไป Portfolio ประมาณ 7–14 วัน Corporate / ระบบธุรกิจอาจใช้ 2–6 สัปดาห์ รายละเอียดระบุในแต่ละแพ็กเกจ',
      },
      {
        q: 'แก้ไขงานได้กี่รอบ?',
        a: 'แต่ละแพ็กเกจมีรอบแก้ไขตามที่ระบุในรายละเอียด หากต้องการเกินกว่านั้น สามารถคุยเพิ่มเติมก่อนเริ่มงานได้',
      },
    ],
  },
  {
    title: 'การสั่งซื้อและการชำระเงิน',
    items: [
      {
        q: 'ชำระเงินผ่านช่องทางใดได้บ้าง?',
        a: 'โอนเงินผ่านพร้อมเพย์หรือบัญชีธนาคาร แล้วอัปโหลดสลิปในระบบ แอดมินจะตรวจสอบและกดยืนยันคำสั่งซื้อ',
      },
      {
        q: 'ชำระแล้วจะได้อะไรต่อ?',
        a: 'หลังจากแอดมินยืนยันสลิปแล้ว ทีมงานจะติดต่อเพื่อเก็บข้อมูลและเริ่มงานตามแพ็กเกจที่สั่ง คุณดูสถานะได้ที่หน้าคำสั่งซื้อของฉัน',
      },
      {
        q: 'ขอใบเสนอราคาก่อนได้ไหม?',
        a: 'ได้ — กด “ขอใบเสนอราคา” หรือไปที่หน้าติดต่อ แล้วระบุความต้องการ ทีมงานจะตอบกลับภายใน 24 ชั่วโมง',
      },
    ],
  },
  {
    title: 'หลังการขายและการสนับสนุน',
    items: [
      {
        q: 'มีประกันหรือดูแลหลังส่งมอบไหม?',
        a: 'มีช่วงดูแลหลังส่งมอบตามแพ็กเกจ หากเจอบั๊กจากงานที่ส่งมอบ เราจะแก้ไขให้ตามเงื่อนไขที่ตกลง',
      },
      {
        q: 'ยกเลิกหรือขอคืนเงินได้อย่างไร?',
        a: 'หากยังไม่เริ่มงาน สามารถแจ้งยกเลิกได้ผ่านอีเมลหรือ Line หากเริ่มงานแล้วจะคิดตามความคืบหน้า โปรดติดต่อเราเพื่อหารือเป็นรายเคส',
      },
      {
        q: 'ติดต่อทีมงานได้ทางไหน?',
        a: 'ผ่านหน้าติดต่อ, อีเมล, หรือ Line Official ของเรา — มีปุ่มแชท Line มุมขวาล่างของทุกหน้า',
      },
    ],
  },
];

function FaqItem({ item, open, onToggle }) {
  return (
    <div className={`faq-item ${open ? 'open' : ''}`}>
      <button type="button" className="faq-question" onClick={onToggle} aria-expanded={open}>
        <span>{item.q}</span>
        <svg className="faq-chevron" aria-hidden="true"><use href="#icon-arrow-right" /></svg>
      </button>
      {open && <div className="faq-answer"><p>{item.a}</p></div>}
    </div>
  );
}

export default function FAQ() {
  const [openKey, setOpenKey] = useState('0-0');

  return (
    <>
      <SEO
        title="คำถามที่พบบ่อย (FAQ)"
        description="คำตอบเกี่ยวกับบริการ แพ็กเกจ การชำระเงิน และการดูแลหลังส่งมอบของ PortfolioPro Studio"
        path="/faq"
        keywords="FAQ, คำถามที่พบบ่อย, รับทำเว็บไซต์, PortfolioPro Studio"
      />

      <header className="page-header">
        <div className="container">
          <div className="section-label">
            <svg><use href="#icon-file" /></svg>
            Help Center
          </div>
          <h1 className="page-title">คำถามที่พบบ่อย</h1>
          <p className="page-desc">
            รวมคำตอบที่ลูกค้าถามบ่อย หากยังไม่พบสิ่งที่ต้องการ ติดต่อเราได้เลย
          </p>
        </div>
      </header>

      <section className="faq-section">
        <div className="container faq-layout">
          {faqGroups.map((group, gi) => (
            <div key={group.title} className="faq-group">
              <h2 className="faq-group-title">{group.title}</h2>
              <div className="faq-list">
                {group.items.map((item, ii) => {
                  const key = `${gi}-${ii}`;
                  return (
                    <FaqItem
                      key={key}
                      item={item}
                      open={openKey === key}
                      onToggle={() => setOpenKey(openKey === key ? '' : key)}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          <div className="faq-cta">
            <h2>ยังต้องการความช่วยเหลือ?</h2>
            <p>ทีมงานพร้อมตอบคำถามและให้คำปรึกษาโปรเจกต์ของคุณ</p>
            <div className="faq-cta-actions">
              <Link to="/contact" className="btn-primary">ติดต่อเรา</Link>
              <Link to="/portfolio" className="btn-secondary">ดูแพ็กเกจบริการ</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

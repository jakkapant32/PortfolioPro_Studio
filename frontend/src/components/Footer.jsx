import { Link } from 'react-router-dom';
import Logo from './Logo';
import { useSiteConfig } from '../hooks/useContent';

export default function Footer() {
  const siteConfig = useSiteConfig();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Logo variant="footer" />
            <p>{siteConfig.tagline}</p>
          </div>
          <div className="footer-col">
            <h4>บริการ</h4>
            <ul>
              <li><Link to="/portfolio"><svg><use href="#icon-briefcase" /></svg>Portfolio Website</Link></li>
              <li><Link to="/portfolio"><svg><use href="#icon-building" /></svg>Corporate Website</Link></li>
              <li><Link to="/portfolio"><svg><use href="#icon-settings" /></svg>Business System</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>บริษัท</h4>
            <ul>
              <li><Link to="/about"><svg><use href="#icon-globe" /></svg>เกี่ยวกับเรา</Link></li>
              <li><Link to="/portfolio"><svg><use href="#icon-eye" /></svg>ผลงาน</Link></li>
              <li><Link to="/blog"><svg><use href="#icon-file" /></svg>บทความ</Link></li>
              <li><Link to="/faq"><svg><use href="#icon-file" /></svg>คำถามที่พบบ่อย</Link></li>
              <li><Link to="/contact"><svg><use href="#icon-mail" /></svg>ติดต่อ</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>ติดต่อ</h4>
            <ul>
              <li><a href={`mailto:${siteConfig.email}`}><svg><use href="#icon-mail" /></svg>{siteConfig.email}</a></li>
              <li><a href={siteConfig.lineUrl} target="_blank" rel="noopener noreferrer"><svg><use href="#icon-message" /></svg>Line: {siteConfig.lineId}</a></li>
              <li><a href={siteConfig.social.facebook} target="_blank" rel="noopener noreferrer"><svg><use href="#icon-globe" /></svg>Facebook</a></li>
              <li><a href={siteConfig.social.instagram} target="_blank" rel="noopener noreferrer"><svg><use href="#icon-globe" /></svg>Instagram</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">© 2026 PortfolioPro Studio. All rights reserved.</div>
      </div>
    </footer>
  );
}

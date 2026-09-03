import { Link } from 'react-router-dom';
import FooterLogoP from './FooterLogoP';

export default function Logo({ variant = 'navbar', onClick, light = false, iconOnly = false, hidden = false }) {
  const isFooter = variant === 'footer';

  return (
    <Link
      to="/"
      className={`logo-brand ${isFooter ? 'logo-brand--footer' : ''}${light ? ' logo-brand--light' : ''}${iconOnly ? ' logo-brand--icon-only' : ''}${hidden ? ' logo-brand--home-hidden' : ''}`}
      onClick={onClick}
      aria-label="PortfolioPro Studio หน้าแรก"
    >
      {isFooter ? (
        <FooterLogoP />
      ) : (
        <img src="/logo-icon.png" alt="" className="logo-brand-icon" />
      )}
      <div className="logo-brand-text">
        <span className="logo-brand-name">
          PortfolioPro <span className="logo-brand-accent">Studio</span>
        </span>
        {isFooter && (
          <span className="logo-brand-tagline">สร้างเว็บไซต์ | สร้างตัวตน | สร้างโอกาส</span>
        )}
      </div>
    </Link>
  );
}

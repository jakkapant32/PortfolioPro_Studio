import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import Logo from './Logo';
import UserMenu from './UserMenu';

const navItems = [
  { to: '/', label: 'หน้าแรก', shortLabel: 'หน้าแรก', icon: 'icon-layout' },
  { to: '/portfolio', label: 'คลังผลงาน & บริการ', shortLabel: 'ผลงาน', icon: 'icon-eye' },
  { to: '/about', label: 'เกี่ยวกับเรา', shortLabel: 'เกี่ยวกับ', icon: 'icon-globe' },
];

const contactMenu = {
  label: 'ติดต่อ',
  shortLabel: 'ติดต่อ',
  icon: 'icon-mail',
  paths: ['/contact', '/faq', '/blog', '/satisfaction'],
  children: [
    { to: '/contact', label: 'ติดต่อเรา', shortLabel: 'ติดต่อเรา', icon: 'icon-mail' },
    { to: '/faq', label: 'คำถามที่พบบ่อย', shortLabel: 'FAQ', icon: 'icon-message' },
    { to: '/blog', label: 'บทความ', shortLabel: 'บทความ', icon: 'icon-file' },
    { to: '/satisfaction', label: 'ประเมินความพึงพอใจ', shortLabel: 'ประเมิน', icon: 'icon-star' },
  ],
};

function NavContactDropdown({ isActivePath }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const openedAtRef = useRef(0);

  const isActive = contactMenu.paths.some((path) => location.pathname.startsWith(path));

  const toggle = () => {
    setOpen((prev) => {
      if (!prev) openedAtRef.current = performance.now();
      return !prev;
    });
  };

  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return undefined;

    let listener = null;

    const armId = window.setTimeout(() => {
      listener = (event) => {
        if (performance.now() - openedAtRef.current < 250) return;
        if (ref.current && ref.current.contains(event.target)) return;
        close();
      };
      document.addEventListener('mousedown', listener);
    }, 0);

    const onEscape = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onEscape);

    return () => {
      window.clearTimeout(armId);
      if (listener) document.removeEventListener('mousedown', listener);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  useEffect(() => {
    close();
  }, [location.pathname]);

  return (
    <li className="nav-dropdown" ref={ref}>
      <button
        type="button"
        className={`nav-dropdown-trigger ${isActive ? 'active' : ''} ${open ? 'open' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <svg className="icon-nav"><use href={`#${contactMenu.icon}`} /></svg>
        <span className="nav-label-full">{contactMenu.label}</span>
        <span className="nav-label-short">{contactMenu.shortLabel}</span>
        <svg className="nav-dropdown-chevron" aria-hidden="true"><use href="#icon-chevron-down" /></svg>
      </button>
      {open && (
        <div className="nav-dropdown-menu" onMouseDown={(e) => e.stopPropagation()}>
          {contactMenu.children.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={isActivePath(item.to) ? 'active' : ''}
              onClick={() => close()}
            >
              <svg><use href={`#${item.icon}`} /></svg>
              <span className="nav-label-full">{item.label}</span>
              <span className="nav-label-short">{item.shortLabel}</span>
            </Link>
          ))}
        </div>
      )}
    </li>
  );
}

export default function Navbar() {
  const { cart, toggleCart } = useCart();
  const { isAuthenticated, openLoginModal } = useAuth();
  const { requireAuth } = useRequireAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileContactOpen, setMobileContactOpen] = useState(false);
  const [heroNavSolid, setHeroNavSolid] = useState(false);

  const isHome = location.pathname === '/';
  const isTransparentNav = isHome && !heroNavSolid && !mobileOpen;

  useEffect(() => {
    if (!isHome) {
      setHeroNavSolid(true);
      return undefined;
    }

    const onScroll = () => {
      setHeroNavSolid(window.scrollY > 72);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  useEffect(() => {
    setMobileOpen(false);
    setMobileContactOpen(false);
  }, [location.pathname]);

  const handleCartClick = () => {
    if (!requireAuth()) return;
    toggleCart();
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const contactSectionActive = contactMenu.paths.some((path) => isActive(path));

  useEffect(() => {
    if (mobileOpen && contactSectionActive) setMobileContactOpen(true);
  }, [mobileOpen, contactSectionActive]);

  return (
    <>
      <nav className={`navbar${isTransparentNav ? ' navbar--transparent' : ''}`}>
        <div className="navbar-inner">
          <div className="navbar-logo">
            <Logo
              variant="navbar"
              light={isTransparentNav}
              hidden={isHome}
              onClick={() => setMobileOpen(false)}
            />
          </div>

          <div className="navbar-center">
            <ul className="nav-links">
              {navItems.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className={isActive(item.to) ? 'active' : ''}>
                    <svg className="icon-nav"><use href={`#${item.icon}`} /></svg>
                    <span className="nav-label-full">{item.label}</span>
                    <span className="nav-label-short">{item.shortLabel}</span>
                  </Link>
                </li>
              ))}
              <NavContactDropdown isActivePath={isActive} />
            </ul>
          </div>

          <div className="nav-right">
            {isAuthenticated ? (
              <UserMenu />
            ) : (
              <button type="button" className="nav-login" onClick={() => openLoginModal()}>เข้าสู่ระบบ</button>
            )}
            <div className="cart-icon-container" onClick={handleCartClick} role="button" tabIndex={0} aria-label="ตะกร้าบริการ">
              <svg className="icon nav-cart-icon"><use href="#icon-cart" /></svg>
              <span className="cart-badge">{cart.length}</span>
            </div>
            <Link to="/contact" className="nav-cta">
              <span>ขอใบเสนอราคา</span>
              <svg className="icon-sm nav-cta-icon"><use href="#icon-arrow-right" /></svg>
            </Link>
            <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="เมนู">
              <svg className="icon nav-menu-icon"><use href="#icon-menu" /></svg>
            </button>
          </div>
        </div>
      </nav>

      <div className={`mobile-nav ${mobileOpen ? 'open' : ''}`}>
        {navItems.map((item) => (
          <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)}>
            {item.label}
          </Link>
        ))}
        <div className="mobile-nav-group">
          <button
            type="button"
            className={`mobile-nav-group-trigger ${contactSectionActive ? 'active' : ''}`}
            onClick={() => setMobileContactOpen((v) => !v)}
            aria-expanded={mobileContactOpen}
          >
            {contactMenu.label}
            <svg className={`mobile-nav-chevron ${mobileContactOpen ? 'open' : ''}`} aria-hidden="true">
              <use href="#icon-chevron-down" />
            </svg>
          </button>
          {mobileContactOpen && (
            <div className="mobile-nav-sub">
              {contactMenu.children.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={isActive(item.to) ? 'active' : ''}
                  onClick={() => {
                    setMobileOpen(false);
                    setMobileContactOpen(false);
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

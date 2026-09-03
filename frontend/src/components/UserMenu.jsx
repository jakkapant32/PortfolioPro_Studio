import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function UserMenu() {
  const { user, logout, openProfileModal } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };

    const timer = setTimeout(() => {
      document.addEventListener('click', onClickOutside);
    }, 0);

    const onEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onEscape);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  const displayName = user?.name?.split(' ')[0] || 'บัญชี';

  return (
    <div className="nav-user-menu" ref={ref}>
      <button
        type="button"
        className={`nav-user-trigger ${open ? 'open' : ''}`}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="nav-user-name">{displayName}</span>
        <svg className="nav-user-chevron" aria-hidden="true"><use href="#icon-chevron-down" /></svg>
      </button>
      {open && (
        <div className="nav-user-dropdown">
          <Link to="/my-projects" onClick={() => setOpen(false)}>
            <svg><use href="#icon-briefcase" /></svg>
            งานของฉัน
          </Link>
          <Link to="/my-orders" onClick={() => setOpen(false)}>
            <svg><use href="#icon-credit-card" /></svg>
            คำสั่งซื้อของฉัน
          </Link>
          <button type="button" onClick={() => { setOpen(false); openProfileModal(); }}>
            <svg><use href="#icon-user" /></svg>
            แก้ไขโปรไฟล์
          </button>
          <button type="button" className="danger" onClick={() => { setOpen(false); logout(); }}>
            <svg><use href="#icon-log-out" /></svg>
            ออกจากระบบ
          </button>
        </div>
      )}
    </div>
  );
}

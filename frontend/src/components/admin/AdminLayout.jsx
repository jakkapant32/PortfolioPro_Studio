import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';

import AdminIcon from './AdminIcon';



const NAV = [

  { to: '/admin/dashboard', end: true, label: 'ภาพรวม', icon: 'layout-dashboard' },

  { to: '/admin/reports', label: 'รายงาน', icon: 'chart' },

  { to: '/admin/orders', label: 'คำสั่งซื้อและส่งมอบ', icon: 'briefcase' },

  { to: '/admin/coupons', label: 'คูปอง', icon: 'tag' },

  { to: '/admin/contacts', label: 'ติดต่อเรา', icon: 'mail' },

  { to: '/admin/quotations', label: 'ใบเสนอราคา', icon: 'file-text' },

  { to: '/admin/portfolio', label: 'บริการ/Portfolio', icon: 'briefcase' },

  { to: '/admin/blog', label: 'บทความ', icon: 'book-open' },

  { to: '/admin/users', label: 'สมาชิก', icon: 'users' },

  { to: '/admin/settings', label: 'ตั้งค่าเว็บ', icon: 'settings' },

];



export default function AdminLayout() {

  const { user, logout } = useAuth();

  const navigate = useNavigate();



  const handleLogout = () => {

    logout();

    navigate('/admin', { replace: true });

  };



  return (

    <div className="admin-shell">

      <aside className="admin-sidebar">

        <div className="admin-brand">

          <AdminIcon name="logo" />

          <div>

            <span>PortfolioPro</span>

            <small>Admin Panel</small>

          </div>

        </div>

        <nav className="admin-nav">

          {NAV.map((item) => (

            <NavLink

              key={item.to}

              to={item.to}

              end={item.end}

              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}

            >

              <AdminIcon name={item.icon} />

              {item.label}

            </NavLink>

          ))}

        </nav>

        <div className="admin-sidebar-footer">

          <div className="admin-user">{user?.name}</div>

          <Link to="/" className="admin-link">← กลับหน้าเว็บ</Link>

          <button type="button" className="admin-logout" onClick={handleLogout}>ออกจากระบบ</button>

        </div>

      </aside>

      <main className="admin-main">

        <Outlet />

      </main>

    </div>

  );

}


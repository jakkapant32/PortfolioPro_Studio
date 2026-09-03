import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminIcon from './AdminIcon';

export default function AdminPublicLayout() {
  const { openAdminLoginModal } = useAuth();

  return (
    <div className="admin-landing-shell">
      <header className="admin-landing-header">
        <div className="container admin-landing-header-inner">
          <div className="admin-landing-brand">
            <AdminIcon name="logo" />
            <div>
              <span>PortfolioPro</span>
              <small>Admin Panel</small>
            </div>
          </div>
          <button type="button" className="btn-primary admin-landing-login" onClick={() => openAdminLoginModal()}>
            เข้าสู่ระบบ Admin
          </button>
        </div>
      </header>
      <main className="admin-landing-main">
        <Outlet />
      </main>
      <footer className="admin-landing-footer">
        <div className="container">
          <p>PortfolioPro Studio · ระบบจัดการหลังบ้าน</p>
        </div>
      </footer>
    </div>
  );
}

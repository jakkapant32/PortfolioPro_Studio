import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminProtectedRoute() {
  const { user, loading, isAuthenticated, openAdminLoginModal } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !isAdmin) {
      openAdminLoginModal();
      navigate('/admin', { replace: true });
    }
  }, [loading, isAuthenticated, isAdmin, navigate, openAdminLoginModal]);

  if (loading || !isAuthenticated || !isAdmin) {
    return null;
  }

  return <Outlet />;
}

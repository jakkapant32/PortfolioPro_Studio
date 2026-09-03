import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export function useRequireAuth() {
  const { isAuthenticated, loading, openLoginModal } = useAuth();

  const requireAuth = useCallback((action) => {
    if (loading) return false;
    if (!isAuthenticated) {
      openLoginModal('กรุณาเข้าสู่ระบบก่อนดำเนินการ', action || null);
      return false;
    }
    if (action) action();
    return true;
  }, [loading, isAuthenticated, openLoginModal]);

  return { requireAuth, isAuthenticated, loading };
}

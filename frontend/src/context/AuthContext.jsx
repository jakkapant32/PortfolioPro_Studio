import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  getStoredSession, clearSession, login as apiLogin, register as apiRegister,
  fetchMe, updateProfile as apiUpdateProfile, isLocalToken, checkApiHealth,
} from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [adminLoginModalOpen, setAdminLoginModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const pendingActionRef = useRef(null);
  const adminSuccessRef = useRef(null);

  useEffect(() => {
    const session = getStoredSession();
    if (!session?.token) {
      setLoading(false);
      return;
    }

    const bootstrap = async () => {
      const apiUp = await checkApiHealth();

      if (isLocalToken(session.token)) {
        if (apiUp) {
          clearSession();
          setLoginMessage('เซิร์ฟเวอร์พร้อมแล้ว — กรุณาเข้าสู่ระบบใหม่เพื่อชำระเงิน');
          setLoginModalOpen(true);
        } else {
          setToken(session.token);
          setUser(session.user);
        }
        setLoading(false);
        return;
      }

      setToken(session.token);
      setUser(session.user);
      const u = await fetchMe(session.token);
      if (u) {
        setUser(u);
      } else if (apiUp) {
        setToken(null);
        setUser(null);
        setLoginMessage('เซสชันหมดอายุ — กรุณาเข้าสู่ระบบใหม่');
        setLoginModalOpen(true);
      }
      setLoading(false);
    };

    bootstrap();
  }, []);

  const login = useCallback(async (email, password) => {
    const session = await apiLogin({ email, password });
    setToken(session.token);
    setUser(session.user);
    return session;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const session = await apiRegister({ name, email, password });
    setToken(session.token);
    setUser(session.user);
    return session;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (payload) => {
    if (!token) throw new Error('กรุณาเข้าสู่ระบบ');
    const updated = await apiUpdateProfile(token, payload);
    setUser(updated);
    return updated;
  }, [token]);

  const closeLoginModal = useCallback(() => {
    setLoginModalOpen(false);
    setLoginMessage('');
    pendingActionRef.current = null;
  }, []);

  const openLoginModal = useCallback((message, onSuccess) => {
    setLoginMessage(message || 'กรุณาเข้าสู่ระบบก่อนดำเนินการ');
    pendingActionRef.current = onSuccess || null;
    setLoginModalOpen(true);
  }, []);

  const onLoginSuccess = useCallback(() => {
    const action = pendingActionRef.current;
    closeLoginModal();
    if (action) action();
  }, [closeLoginModal]);

  const closeAdminLoginModal = useCallback(() => {
    setAdminLoginModalOpen(false);
    adminSuccessRef.current = null;
  }, []);

  const openAdminLoginModal = useCallback((onSuccess) => {
    adminSuccessRef.current = onSuccess || null;
    setAdminLoginModalOpen(true);
  }, []);

  const onAdminLoginSuccess = useCallback(() => {
    const action = adminSuccessRef.current;
    closeAdminLoginModal();
    if (action) action();
  }, [closeAdminLoginModal]);

  const openProfileModal = useCallback(() => setProfileModalOpen(true), []);
  const closeProfileModal = useCallback(() => setProfileModalOpen(false), []);

  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider value={{
      user, token, loading, isAuthenticated,
      login, register, logout, updateProfile,
      loginModalOpen, loginMessage,
      openLoginModal, closeLoginModal, onLoginSuccess,
      adminLoginModalOpen, openAdminLoginModal, closeAdminLoginModal, onAdminLoginSuccess,
      profileModalOpen, openProfileModal, closeProfileModal,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

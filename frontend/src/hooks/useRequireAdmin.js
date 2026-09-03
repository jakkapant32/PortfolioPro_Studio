import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function useRequireAdmin() {
  const { user, token, loading, isAuthenticated, openAdminLoginModal } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !isAdmin) {
      openAdminLoginModal();
      navigate('/admin', { replace: true });
    }
  }, [loading, isAuthenticated, isAdmin, navigate, openAdminLoginModal]);

  return { user, token, isAdmin, loading: loading || !isAuthenticated || !isAdmin };
}

export const ADMIN_STATUS_LABELS = {
  new: 'ใหม่',
  in_progress: 'กำลังดำเนินการ',
  done: 'เสร็จแล้ว',
};

export const ORDER_STATUS_LABELS = {
  pending: 'รอชำระ',
  awaiting_payment: 'รอโอน/รอแนบสลิป',
  slip_submitted: 'รอตรวจสอบสลิป',
  rejected: 'สลิปไม่ผ่าน',
  deposit_paid: 'มัดจำแล้ว',
  successful: 'ยืนยันแล้ว',
  failed: 'ล้มเหลว',
  expired: 'หมดเวลา',
};

export const PROJECT_STATUS_LABELS = {
  pending: 'รอร่างสัญญา',
  contract_sent: 'รอลูกค้าเซ็นสัญญา',
  contract_accepted: 'ลูกค้าเซ็นแล้ว',
  in_progress: 'กำลังทำงาน',
  delivered: 'ส่งมอบแล้ว',
  completed: 'ปิดงาน',
};

export function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function parseItems(json) {
  if (!json) return [];
  try {
    const data = JSON.parse(json);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

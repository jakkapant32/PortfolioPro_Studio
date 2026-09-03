import { API_URL } from '../config/api';

import { isLocalToken } from './auth';

function authHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function paymentError(data, status) {
  if (status === 401 || data?.error === 'invalid token' || data?.error === 'invalid token claims') {
    return 'เซสชันหมดอายุ — กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่';
  }
  return data?.error || 'ไม่สามารถดำเนินการชำระเงินได้';
}

export function resolvePaymentQRUrl(payment) {
  if (!payment?.qr_image_url) return null;
  if (payment.fallback || payment.mode === 'fallback') return payment.qr_image_url;
  if (payment.qr_requires_auth && payment.order_id) {
    return `${API_URL}/api/payments/${payment.order_id}/qr`;
  }
  if (payment.qr_image_url.startsWith('/')) {
    return `${API_URL}${payment.qr_image_url}`;
  }
  return payment.qr_image_url;
}

export async function fetchPaymentQR(payment) {
  const url = resolvePaymentQRUrl(payment);
  if (!url) return null;
  if (!payment.qr_requires_auth && !url.includes('/api/payments/')) {
    return url;
  }
  const response = await fetch(url, { headers: authHeaders(payment.token) });
  if (!response.ok) {
    throw new Error('ไม่สามารถโหลด QR Code ได้');
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function getPaymentConfig() {
  const response = await fetch(`${API_URL}/api/payments/config`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'ไม่สามารถโหลดช่องทางชำระเงินได้');
  }
  return data;
}

export async function createPayment(payload, token) {
  if (isLocalToken(token)) {
    throw new Error('กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่ (เซิร์ฟเวอร์ไม่พร้อมตอนที่คุณ login ครั้งก่อน)');
  }
  const response = await fetch(`${API_URL}/api/payments`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(paymentError(data, response.status));
  }
  return data;
}

export async function payOrderBalance(orderId, payload, token) {
  const response = await fetch(`${API_URL}/api/payments/${orderId}/balance`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload || {}),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(paymentError(data, response.status));
  }
  return data;
}

export async function completePayment(orderId, token) {
  const response = await fetch(`${API_URL}/api/payments/${orderId}/complete`, {
    method: 'POST',
    headers: authHeaders(token),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'ไม่สามารถยืนยันการชำระเงินได้');
  }
  return data;
}

export async function getPaymentStatus(orderId, token) {
  const response = await fetch(`${API_URL}/api/payments/${orderId}/status`, {
    headers: authHeaders(token),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'ไม่สามารถตรวจสอบสถานะได้');
  }
  return data;
}

export async function uploadPaymentSlip(orderId, file, token) {
  let payload = file;
  try {
    const { compressSlipImage } = await import('../utils/compressSlip');
    payload = await compressSlipImage(file);
  } catch {
    payload = file;
  }
  if (payload.size > 5 * 1024 * 1024) {
    throw new Error('ไฟล์ใหญ่เกิน 5MB กรุณาใช้รูปที่เล็กกว่า หรือถ่ายสลิปใหม่');
  }

  const body = new FormData();
  body.append('slip', payload);
  let response;
  try {
    response = await fetch(`${API_URL}/api/payments/${orderId}/slip`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    });
  } catch {
    throw new Error('ส่งสลิปไม่สำเร็จ — ไฟล์อาจใหญ่เกินไปหรือเซิร์ฟเวอร์ไม่ตอบ ส่งรูปที่เล็กกว่าแล้วลองใหม่');
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    throw new Error(paymentError(data, response.status));
  }
  return data;
}

export async function fetchPaymentSlip(orderId, token) {
  const response = await fetch(`${API_URL}/api/payments/${orderId}/slip`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error('ไม่สามารถโหลดสลิปได้');
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function fetchAdminPaymentSlip(orderId, token) {
  const response = await fetch(`${API_URL}/api/admin/orders/${orderId}/slip`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error('ไม่สามารถโหลดสลิปได้');
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

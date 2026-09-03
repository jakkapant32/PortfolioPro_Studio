import { API_URL } from '../config/api';

function authHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function validateCoupon(code, subtotal, token) {
  const response = await fetch(`${API_URL}/api/coupons/validate`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ code, subtotal }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'โค้ดส่วนลดไม่ถูกต้อง');
  }
  return data;
}

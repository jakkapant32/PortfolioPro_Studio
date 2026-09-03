import { API_URL } from '../config/api';

function authHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function apiFetch(path, token, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}/api${path}`, {
      ...options,
      headers: { ...authHeaders(token), ...options.headers },
    });
  } catch {
    throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ — ตรวจสอบว่า backend รันอยู่');
  }
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('ไม่พบ API — กรุณารีสตาร์ท backend (go run .)');
    }
    throw new Error(data.error || `เกิดข้อผิดพลาด (${response.status})`);
  }
  return data;
}

export function getMyOrders(token) {
  return apiFetch('/my-orders', token);
}

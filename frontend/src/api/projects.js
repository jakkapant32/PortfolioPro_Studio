import { API_URL } from '../config/api';

function authHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function apiFetch(path, token, options = {}) {
  const response = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: { ...authHeaders(token), ...options.headers },
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  if (!response.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');
  return data;
}

export function getMyProjects(token) {
  return apiFetch('/my-projects', token);
}

export function getMyProject(token, id) {
  return apiFetch(`/my-projects/${id}`, token);
}

export function acceptContract(token, id) {
  return apiFetch(`/my-projects/${id}/contract/accept`, token, { method: 'POST' });
}

export function receiveDelivery(token, id) {
  return apiFetch(`/my-projects/${id}/delivery/receive`, token, { method: 'POST' });
}

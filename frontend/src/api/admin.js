import { API_URL } from '../config/api';

function authHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function adminFetch(path, token, options = {}) {
  const response = await fetch(`${API_URL}/api/admin${path}`, {
    ...options,
    headers: { ...authHeaders(token), ...options.headers },
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('ไม่พบ API หลังบ้าน — กรุณา restart backend (go run .)');
    }
    throw new Error(data.error || 'เกิดข้อผิดพลาด');
  }
  return data;
}

export function getDashboard(token) {
  return adminFetch('/dashboard', token);
}

export function getReports(token, params = {}) {
  const qs = new URLSearchParams(params).toString();
  return adminFetch(`/reports${qs ? `?${qs}` : ''}`, token);
}

export function getCoupons(token) {
  return adminFetch('/coupons', token);
}

export function createCoupon(token, payload) {
  return adminFetch('/coupons', token, { method: 'POST', body: JSON.stringify(payload) });
}

export function updateCoupon(token, id, payload) {
  return adminFetch(`/coupons/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) });
}

export function deleteCoupon(token, id) {
  return adminFetch(`/coupons/${id}`, token, { method: 'DELETE' });
}

export function getOrders(token, params = {}) {
  const qs = new URLSearchParams(params).toString();
  return adminFetch(`/orders${qs ? `?${qs}` : ''}`, token);
}

export function getOrder(token, id) {
  return adminFetch(`/orders/${id}`, token);
}

export function getContacts(token, params = {}) {
  const qs = new URLSearchParams(params).toString();
  return adminFetch(`/contacts${qs ? `?${qs}` : ''}`, token);
}

export function getContact(token, id) {
  return adminFetch(`/contacts/${id}`, token);
}

export function updateContact(token, id, payload) {
  return adminFetch(`/contacts/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function getQuotations(token, params = {}) {
  const qs = new URLSearchParams(params).toString();
  return adminFetch(`/quotations${qs ? `?${qs}` : ''}`, token);
}

export function getQuotation(token, id) {
  return adminFetch(`/quotations/${id}`, token);
}

export function updateQuotation(token, id, payload) {
  return adminFetch(`/quotations/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function getUsers(token, params = {}) {
  const qs = new URLSearchParams(params).toString();
  return adminFetch(`/users${qs ? `?${qs}` : ''}`, token);
}

export function updateOrder(token, id, payload) {
  return adminFetch(`/orders/${id}`, token, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function confirmOrderPayment(token, id) {
  return adminFetch(`/orders/${id}/confirm-payment`, token, { method: 'POST', body: JSON.stringify({}) });
}

export function rejectOrderPayment(token, id, reason) {
  return adminFetch(`/orders/${id}/reject-payment`, token, {
    method: 'POST',
    body: JSON.stringify({ reason: reason || '' }),
  });
}

export function deleteOrder(token, id) {
  return adminFetch(`/orders/${id}`, token, { method: 'DELETE' });
}

export function createUser(token, payload) {
  return adminFetch('/users', token, { method: 'POST', body: JSON.stringify(payload) });
}

export function updateUser(token, id, payload) {
  return adminFetch(`/users/${id}`, token, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function deleteUser(token, id) {
  return adminFetch(`/users/${id}`, token, { method: 'DELETE' });
}

export function deleteContact(token, id) {
  return adminFetch(`/contacts/${id}`, token, { method: 'DELETE' });
}

export function deleteQuotation(token, id) {
  return adminFetch(`/quotations/${id}`, token, { method: 'DELETE' });
}

export function getAdminPortfolio(token) {
  return adminFetch('/portfolio', token);
}

export function createPortfolio(token, payload) {
  return adminFetch('/portfolio', token, { method: 'POST', body: JSON.stringify(payload) });
}

export function updatePortfolio(token, id, payload) {
  return adminFetch(`/portfolio/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) });
}

export function deletePortfolio(token, id) {
  return adminFetch(`/portfolio/${id}`, token, { method: 'DELETE' });
}

export function getAdminBlog(token) {
  return adminFetch('/blog', token);
}

export function createBlog(token, payload) {
  return adminFetch('/blog', token, { method: 'POST', body: JSON.stringify(payload) });
}

export function updateBlog(token, id, payload) {
  return adminFetch(`/blog/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) });
}

export function deleteBlog(token, id) {
  return adminFetch(`/blog/${id}`, token, { method: 'DELETE' });
}

export function getAdminSiteConfig(token) {
  return adminFetch('/site-config', token);
}

export function updateSiteConfig(token, payload) {
  return adminFetch('/site-config', token, { method: 'PUT', body: JSON.stringify(payload) });
}

export function getProjects(token, params = {}) {
  const qs = new URLSearchParams(params).toString();
  return adminFetch(`/projects${qs ? `?${qs}` : ''}`, token);
}

export function getProject(token, id) {
  return adminFetch(`/projects/${id}`, token);
}

export function createProject(token, payload) {
  return adminFetch('/projects', token, { method: 'POST', body: JSON.stringify(payload) });
}

export function createProjectFromOrder(token, orderId) {
  return adminFetch(`/orders/${orderId}/project`, token, { method: 'POST' });
}

export function updateProject(token, id, payload) {
  return adminFetch(`/projects/${id}`, token, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function deleteProject(token, id) {
  return adminFetch(`/projects/${id}`, token, { method: 'DELETE' });
}

export function saveContract(token, id, payload) {
  return adminFetch(`/projects/${id}/contract`, token, { method: 'PUT', body: JSON.stringify(payload) });
}

export function sendContract(token, id) {
  return adminFetch(`/projects/${id}/contract/send`, token, { method: 'POST' });
}

export function saveDelivery(token, id, payload) {
  return adminFetch(`/projects/${id}/delivery`, token, { method: 'PUT', body: JSON.stringify(payload) });
}

export function sendDelivery(token, id) {
  return adminFetch(`/projects/${id}/delivery/send`, token, { method: 'POST' });
}

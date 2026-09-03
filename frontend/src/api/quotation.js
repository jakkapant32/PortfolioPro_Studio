import { API_URL } from '../config/api';

function authHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function submitQuotation(data, token) {
  const response = await fetch(`${API_URL}/api/quotations`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to submit quotation');
  }

  return response.json();
}

export async function submitContact(data) {
  const response = await fetch(`${API_URL}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to submit contact');
  }

  return response.json();
}

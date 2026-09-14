import { API_URL } from '../config/api';

export async function submitSatisfaction(data, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}/api/satisfaction`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || 'ไม่สามารถส่งแบบประเมินได้');
  }
  return body;
}

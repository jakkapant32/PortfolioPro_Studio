import { getLocalSession, loginLocal, registerLocal, clearLocalSession } from '../utils/localAuth';

import { API_URL } from '../config/api';
const SESSION_KEY = 'pps_session';

export function isLocalToken(token) {
  return typeof token === 'string' && token.startsWith('local-');
}

export async function checkApiHealth() {
  try {
    const response = await fetch(`${API_URL}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export function getStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : getLocalSession();
  } catch {
    return getLocalSession();
  }
}

export function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  clearLocalSession();
}

async function tryApi(path, body) {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = response.status;
    throw err;
  }
  return data;
}

export async function login({ email, password }) {
  try {
    const data = await tryApi('/api/auth/login', { email, password });
    const session = { token: data.token, user: data.user };
    saveSession(session);
    return session;
  } catch (err) {
    if (err.status) throw err;
    const session = loginLocal({ email, password });
    saveSession(session);
    return session;
  }
}

export async function register({ name, email, password }) {
  try {
    const data = await tryApi('/api/auth/register', { name, email, password });
    const session = { token: data.token, user: data.user };
    saveSession(session);
    return session;
  } catch (err) {
    if (err.status) throw err;
    const session = registerLocal({ name, email, password });
    saveSession(session);
    return session;
  }
}

export async function fetchMe(token) {
  if (isLocalToken(token)) {
    return null;
  }
  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 401) {
      clearSession();
      return null;
    }
    if (!response.ok) return null;
    const data = await response.json();
    return data.user;
  } catch {
    return null;
  }
}

export async function updateProfile(token, payload) {
  if (token?.startsWith('local-')) {
    const session = getStoredSession();
    if (!session) throw new Error('ไม่พบ session');
    const user = { ...session.user, name: payload.name, email: payload.email?.toLowerCase() || session.user.email };
    saveSession({ ...session, user });
    return user;
  }
  const response = await fetch(`${API_URL}/api/auth/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'บันทึกไม่สำเร็จ');
  const session = getStoredSession();
  if (session) saveSession({ ...session, user: data.user });
  return data.user;
}

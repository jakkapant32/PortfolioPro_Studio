const USERS_KEY = 'pps_users';
const SESSION_KEY = 'pps_session';

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getLocalSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearLocalSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function registerLocal({ name, email, password }) {
  const users = loadUsers();
  if (users.find((u) => u.email === email.toLowerCase())) {
    throw new Error('อีเมลนี้ถูกใช้งานแล้ว');
  }
  const user = {
    id: Date.now(),
    name,
    email: email.toLowerCase(),
    password,
  };
  users.push(user);
  saveUsers(users);
  const session = { token: `local-${user.id}`, user: { id: user.id, name: user.name, email: user.email } };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function loginLocal({ email, password }) {
  const users = loadUsers();
  const user = users.find((u) => u.email === email.toLowerCase() && u.password === password);
  if (!user) {
    throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  }
  const session = { token: `local-${user.id}`, user: { id: user.id, name: user.name, email: user.email } };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

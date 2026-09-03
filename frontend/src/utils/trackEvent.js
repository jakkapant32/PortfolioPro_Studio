import { API_URL } from '../config/api';
const SESSION_KEY = 'pps_analytics_session';

function getSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `s_${Date.now()}`;
  }
}

export function trackEvent(eventType, payload = {}) {
  const body = {
    event_type: eventType,
    session_id: getSessionId(),
    path: payload.path ?? (typeof window !== 'undefined' ? window.location.pathname : ''),
    item_id: payload.itemId ?? 0,
    item_title: payload.itemTitle ?? '',
  };

  const headers = { 'Content-Type': 'application/json' };
  try {
    const raw = localStorage.getItem('pps_session');
    if (raw) {
      const session = JSON.parse(raw);
      if (session?.token && !String(session.token).startsWith('local-')) {
        headers.Authorization = `Bearer ${session.token}`;
      }
    }
  } catch { /* ignore */ }

  fetch(`${API_URL}/api/analytics/event`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}

export const AnalyticsEvents = {
  PAGE_VIEW: 'page_view',
  PORTFOLIO_VIEW: 'portfolio_view',
  PRODUCT_VIEW: 'product_view',
  ADD_TO_CART: 'add_to_cart',
  CHECKOUT_START: 'checkout_start',
  PAYMENT_SUCCESS: 'payment_success',
};

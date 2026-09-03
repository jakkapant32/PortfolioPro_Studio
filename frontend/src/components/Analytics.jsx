import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent, AnalyticsEvents } from '../utils/trackEvent';

const GA_ID = import.meta.env.VITE_GA_ID;
const CLARITY_ID = import.meta.env.VITE_CLARITY_ID;

function loadScript(id, src) {
  if (document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

export default function Analytics() {
  const location = useLocation();

  useEffect(() => {
    if (!GA_ID) return;
    loadScript('ga4-lib', `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`);
    window.dataLayer = window.dataLayer || [];
    function gtag(...args) {
      window.dataLayer.push(args);
    }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID, { send_page_view: false });
  }, []);

  useEffect(() => {
    if (!CLARITY_ID || window.clarity) return;
    (function (c, l, a, r, i) {
      c[a] = c[a] || function (...args) { (c[a].q = c[a].q || []).push(args); };
      const t = l.createElement(r);
      t.async = 1;
      t.src = `https://www.clarity.ms/tag/${i}`;
      const y = l.getElementsByTagName(r)[0];
      y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_ID);
  }, []);

  useEffect(() => {
    if (GA_ID && window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
        page_title: document.title,
      });
    }
    trackEvent(AnalyticsEvents.PAGE_VIEW, {
      path: location.pathname + location.search,
    });
  }, [location]);

  return null;
}

export function getGaDashboardUrl() {
  return GA_ID ? `https://analytics.google.com/` : null;
}

export function getClarityDashboardUrl() {
  return CLARITY_ID ? 'https://clarity.microsoft.com/projects' : null;
}

export function isGaConfigured() {
  return Boolean(GA_ID);
}

export function isClarityConfigured() {
  return Boolean(CLARITY_ID);
}

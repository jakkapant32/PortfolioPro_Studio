const API_PORT = import.meta.env.VITE_API_PORT || '8081';

function resolveApiUrl() {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (envUrl) return envUrl.replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:${API_PORT}`;
  }

  return `http://localhost:${API_PORT}`;
}

export const API_URL = resolveApiUrl();

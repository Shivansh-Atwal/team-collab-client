// Backend location, from VITE_BACKEND_URL. Vite bakes this in at BUILD time, so on a hosting
// service it must be set in the dashboard's environment variables before the build runs.
// When empty, requests stay same-origin and the Vite dev proxy forwards them (local dev only).
export const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || '').trim().replace(/\/+$/, '');

export const API_URL = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';
export const SOCKET_URL = BACKEND_URL || '/';

// Uploaded files are stored as "/uploads/..." paths on the backend
export const assetUrl = (path = '') => (BACKEND_URL && path.startsWith('/') ? `${BACKEND_URL}${path}` : path);

// Detect the usual deployment mistakes so the UI can say what is wrong instead of hanging
const isLocal = (host) => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host);
export function backendConfigProblem() {
  if (typeof window === 'undefined') return null;
  const pageHost = window.location.hostname;
  if (isLocal(pageHost)) return null;
  if (!BACKEND_URL) {
    return 'VITE_BACKEND_URL is not set for this build, so requests go to the frontend host. Set it to your backend URL in your hosting settings and redeploy.';
  }
  let backend;
  try {
    backend = new URL(BACKEND_URL);
  } catch {
    return `VITE_BACKEND_URL "${BACKEND_URL}" is not a valid URL.`;
  }
  if (isLocal(backend.hostname)) {
    return `This deployed site points to ${BACKEND_URL}, which is the visitor's own computer. Set VITE_BACKEND_URL to your deployed backend URL and redeploy.`;
  }
  if (window.location.protocol === 'https:' && backend.protocol === 'http:') {
    return `This page is HTTPS but the backend is HTTP (${BACKEND_URL}); browsers block that. Use the https:// backend URL.`;
  }
  return null;
}

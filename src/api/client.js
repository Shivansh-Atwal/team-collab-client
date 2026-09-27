import axios from 'axios';
import { API_URL, BACKEND_URL } from '../config.js';

export const TOKEN_KEY = 'teamcollab_token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

// 60 s covers free-tier hosts that sleep and take ~30-50 s to wake up; without a timeout a
// request to an unreachable backend just hangs and the UI looks frozen.
const api = axios.create({ baseURL: API_URL, timeout: 60000 });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If the request hit the frontend host instead of the API, it gets index.html back
api.interceptors.response.use((res) => {
  if (typeof res.data === 'string' && /^\s*<!doctype html/i.test(res.data)) {
    return Promise.reject(Object.assign(new Error('The API returned a web page instead of data — VITE_BACKEND_URL is probably not pointing at the backend.'), { isConfig: true }));
  }
  return res;
});

// Normalise errors to a readable message
export const errorMessage = (err) => {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.isConfig) return err.message;
  const where = BACKEND_URL || window.location.origin;
  if (err?.code === 'ECONNABORTED') return `The server at ${where} did not respond in time. If it is on a free host it may be waking up — try again in a minute.`;
  if (err?.code === 'ERR_NETWORK' || (err?.request && !err?.response)) {
    return `Can't reach the server at ${where}. It may be down, still starting, or blocking this site (CORS).`;
  }
  if (err?.response?.status === 404) return `API route not found at ${where} — check VITE_BACKEND_URL.`;
  return err?.message || 'Something went wrong';
};

// Convenience wrappers scoped to a workspace
export const wsApi = (workspaceId) => {
  const base = `/workspaces/${workspaceId}`;
  return {
    get: (path = '', config) => api.get(`${base}${path}`, config).then((r) => r.data),
    post: (path, body, config) => api.post(`${base}${path}`, body, config).then((r) => r.data),
    patch: (path, body) => api.patch(`${base}${path}`, body).then((r) => r.data),
    put: (path, body) => api.put(`${base}${path}`, body).then((r) => r.data),
    del: (path) => api.delete(`${base}${path}`).then((r) => r.data),
  };
};

export default api;

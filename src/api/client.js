import axios from 'axios';

export const TOKEN_KEY = 'teamcollab_token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalise errors to a readable message
export const errorMessage = (err) => err?.response?.data?.message || err?.message || 'Something went wrong';

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

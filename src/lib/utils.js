export const greeting = (date = new Date()) => {
  const h = date.getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export const firstName = (name = '') => name.trim().split(/\s+/)[0] || '';

export const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';

const COLORS = ['#1a73e8', '#d93025', '#e37400', '#188038', '#9334e6', '#007b83', '#c5221f', '#b06000'];
// Must match server/utils/helpers.js userColor so avatars and cursors agree
export const userColor = (userId = '') => {
  const s = String(userId);
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
};

export const formatBytes = (bytes = 0) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
};

export const formatDate = (d, opts = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  d ? new Date(d).toLocaleDateString(undefined, opts) : '';

export const formatTime = (d) => new Date(d).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export const timeAgo = (d) => {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
};

export const dayLabel = (d) => {
  const date = new Date(d);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yest.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
};

// "/uploads/1712-abcd1234-report.pdf" -> "report.pdf"
export const attachmentName = (url = '') => decodeURIComponent(url.split('/').pop() || '').replace(/^\d+-[a-f0-9]+-/, '');

export const isImage = (nameOrType = '') => /(^image\/)|(\.(png|jpe?g|gif|webp|svg)$)/i.test(nameOrType);

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

// Page keys reported by presence -> human labels
export const PAGE_LABELS = {
  overview: 'Overview',
  chat: 'Chat',
  board: 'Task board',
  files: 'Files',
  canvas: 'Design canvas',
  code: 'Code editor',
  dashboard: 'Dashboard',
  members: 'Members',
};
export const pageLabel = (key) => PAGE_LABELS[key] || 'Overview';

export const cx = (...c) => c.filter(Boolean).join(' ');

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

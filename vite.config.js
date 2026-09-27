import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// The app calls the backend at VITE_BACKEND_URL (client/.env). The dev proxy below targets the
// same address, so it also works if VITE_BACKEND_URL is left empty (same-origin mode).
// `npm run dev:phone` serves over HTTPS on your LAN: phones only allow camera/mic on HTTPS.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const API = env.VITE_API_PROXY || env.VITE_BACKEND_URL || 'http://localhost:5000';

  return {
    plugins: [react(), ...(mode === 'phone' ? [basicSsl()] : [])],
    server: {
      port: 5173,
      host: mode === 'phone' ? true : undefined,
      proxy: {
        '/api': API,
        '/uploads': API,
        '/socket.io': { target: API, ws: true },
      },
    },
  };
});

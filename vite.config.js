import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

const API = process.env.VITE_API_PROXY || 'http://localhost:5000';

// In dev, the API, uploads and the Socket.IO endpoint are proxied to the Express server,
// so the client can use same-origin URLs everywhere.
// `npm run dev:phone` serves over HTTPS on your LAN: phones only allow camera/mic on HTTPS.
export default defineConfig(({ mode }) => ({
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
}));

// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy para el servicio de traducción
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Proxy para el servicio de autenticación
      '/api-auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-auth/, '/api'),
      },
      // Proxy para el servicio de permisos
      '/api-permissions': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-permissions/, '/api'),
      },
    },
  },
});
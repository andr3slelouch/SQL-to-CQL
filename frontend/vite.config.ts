// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy para el servicio de traducción
      '/api/translator': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Proxy para el servicio de autenticación
      '/api/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Proxy para el servicio de permisos - asegurando que vaya al puerto 3002
      '/api/admin/permissions': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      // Ruta de fallback para el resto de endpoints del servicio de permisos
      '/api/admin': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
});
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '127.0.0.1',
    proxy: {
      '/providers': {
        target: process.env.VITE_API_URL || 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/ollama': {
        target: process.env.VITE_API_URL || 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/rag': {
        target: process.env.VITE_API_URL || 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/v1': {
        target: process.env.VITE_API_URL || 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    css: true
  }
});

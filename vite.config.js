import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: ['@electric-sql/pglite'],
  },
  worker: {
    format: 'es',
  },
  server: {
    port: 5173,
    host: true,
  },
});

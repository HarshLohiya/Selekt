import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const sourcemap = process.env.SOURCEMAP === 'true';

// For each route prefix below, add proxy entry to http://localhost:3010
// Add another set with '/selekt' prefix, as that base url is used during dev/testing
// Previously this project use create-react-app, which automatically fell back to proxy for special cases
// With Vite, this needs to be more explicit
const PROXY_ROUTES = [
  '/api',
  '/statement-results',
  '/auth/saml',
  '/login/callback',
  '/auth/google',
  '/auth/oidc',
];

const PROXY_URL = 'http://127.0.0.1:3010';

const proxy: Record<string, string> = {};

PROXY_ROUTES.forEach((route) => {
  proxy[route] = PROXY_URL;
  proxy[`/selekt${route}`] = PROXY_URL;
});

// This wildcard route is used for the UI to figure out what the baseURL is for the app
// The UI is built without knowing this information
proxy['^/.*/api/app'] = PROXY_URL;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/selekt/api': {
        target: 'http://localhost:3010',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  base: '/selekt/',
  build: {
    outDir: 'build',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Multi-page build: each toy is its own HTML entry, so no client router and
// no SPA fallback are needed. Output: dist/index.html, dist/<toy>/index.html.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        trebuchet: resolve(import.meta.dirname, 'trebuchet/index.html'),
        layers: resolve(import.meta.dirname, 'layers/index.html'),
      },
    },
  },
});

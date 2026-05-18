import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), cloudflare()],
  server: {
    proxy: {
      '/parties': {
        target: 'http://localhost:1999',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
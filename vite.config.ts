import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/party': {
        target: 'http://localhost:1999',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});

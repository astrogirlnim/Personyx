import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, '../shared'),
      '@renderer': resolve(__dirname, '.'),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
});

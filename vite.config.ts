
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 'base' is required for GitHub Pages to serve assets correctly from a subdirectory
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});

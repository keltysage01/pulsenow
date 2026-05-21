import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'source',
  base: './',
  plugins: [react()],
  build: {
    outDir: '../build-output',
    emptyOutDir: true,
  },
});

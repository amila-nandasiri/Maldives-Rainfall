import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // This 'base' MUST match your repository name on GitHub
  base: '/maldives-rainfall/', 
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

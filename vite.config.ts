import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Replace 'maldives-rainfall' with your actual repository name
  base: '/maldives-rainfall/', 
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

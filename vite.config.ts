
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // حل مشكلة "@/..." التي قد تظهر في بعض بيئات التطوير
      '@': path.resolve(__dirname, './'),
    },
  },
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
  },
  build: {
    outDir: 'dist',
  }
});

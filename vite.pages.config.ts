import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: path.resolve('pages-site'),
  base: '/ai-love/',
  plugins: [react()],
  define: { 'import.meta.env.VITE_MOONMIND_PAGES_BACKEND': JSON.stringify('https://moonmind-inner-orbit.superskunk.chatgpt.site') },
  build: { outDir: path.resolve('dist-pages'), assetsDir: 'pages-assets', emptyOutDir: true },
});

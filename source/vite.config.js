import { defineConfig } from 'vite';

// base: './' so the production build works from any static host (file paths are relative).
export default defineConfig({
  base: './',
  server: {
    host: true,
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // public/manifest.json is the source of truth for the manifest
      manifest: false,
      includeAssets: ['icon-192.png', 'icon-512.png', 'manifest.json'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: '/index.html',
      },
    }),
  ],
  server: { port: 8100 },
  // Ionic + the language list make one ~1 MB bundle; it is precached for offline use
  build: { chunkSizeWarningLimit: 1500 },
});

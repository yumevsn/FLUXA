import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The web app is served from /app/ on the website (see scripts/build-site.mjs);
// the desktop and mobile apps serve it from the root.
const base = process.env.FLUXA_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered from src/main.tsx, only in the browser (not the desktop/mobile apps)
      injectRegister: null,
      // public/manifest.json is the source of truth for the manifest
      manifest: false,
      includeAssets: ['icon-192.png', 'icon-512.png', 'manifest.json'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
  server: { port: 8100, strictPort: true },
  // Keep Tauri's Rust output visible in the terminal
  clearScreen: false,
  // Ionic + the language list make one ~1 MB bundle; it is precached for offline use
  build: {
    chunkSizeWarningLimit: 1500,
    // Modern engines only (Chrome/Edge WebView2, Safari 15+): smaller, faster code
    target: ['es2021', 'chrome100', 'edge100', 'safari15', 'firefox100'],
  },
});

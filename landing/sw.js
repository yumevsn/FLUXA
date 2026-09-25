// FLUXA used to be served from the site root with an offline service worker
// at /sw.js. The app now lives at /app/ (with its own worker) and the root is
// the landing page. This replacement worker removes the old one and its
// caches so returning visitors see the landing page instead of a cached app.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      // Leave the app's own caches (scope /app/) alone
      await Promise.all(keys.filter((k) => !k.includes('/app/')).map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url));
    })()
  );
});

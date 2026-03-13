// Minimal service worker — enables "Add to Home Screen" PWA install prompt.
// No caching so the dashboard always shows live data.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Pass all fetches through to the network (no offline caching needed)
self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request));
});

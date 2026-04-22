const CACHE_NAME = 'cert-editor-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Fetch from network and update cache (Stale-while-revalidate)
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Only cache successful requests
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((e) => {
        console.log('App is offline, falling back to cache if available', e);
      });
      
      // Return cached version immediately if available, otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});

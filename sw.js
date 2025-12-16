const CACHE_NAME = 'tute-v1';
const BASE_URL = '/tute/';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  BASE_URL,
  BASE_URL + 'index.html',
  BASE_URL + 'manifest.json',
  // Card images
  BASE_URL + 'cards/back.png',
  BASE_URL + 'cards/oros-1.png',
  BASE_URL + 'cards/oros-2.png',
  BASE_URL + 'cards/oros-3.png',
  BASE_URL + 'cards/oros-4.png',
  BASE_URL + 'cards/oros-5.png',
  BASE_URL + 'cards/oros-6.png',
  BASE_URL + 'cards/oros-7.png',
  BASE_URL + 'cards/oros-10.png',
  BASE_URL + 'cards/oros-11.png',
  BASE_URL + 'cards/oros-12.png',
  BASE_URL + 'cards/copas-1.png',
  BASE_URL + 'cards/copas-2.png',
  BASE_URL + 'cards/copas-3.png',
  BASE_URL + 'cards/copas-4.png',
  BASE_URL + 'cards/copas-5.png',
  BASE_URL + 'cards/copas-6.png',
  BASE_URL + 'cards/copas-7.png',
  BASE_URL + 'cards/copas-10.png',
  BASE_URL + 'cards/copas-11.png',
  BASE_URL + 'cards/copas-12.png',
  BASE_URL + 'cards/espadas-1.png',
  BASE_URL + 'cards/espadas-2.png',
  BASE_URL + 'cards/espadas-3.png',
  BASE_URL + 'cards/espadas-4.png',
  BASE_URL + 'cards/espadas-5.png',
  BASE_URL + 'cards/espadas-6.png',
  BASE_URL + 'cards/espadas-7.png',
  BASE_URL + 'cards/espadas-10.png',
  BASE_URL + 'cards/espadas-11.png',
  BASE_URL + 'cards/espadas-12.png',
  BASE_URL + 'cards/bastos-1.png',
  BASE_URL + 'cards/bastos-2.png',
  BASE_URL + 'cards/bastos-3.png',
  BASE_URL + 'cards/bastos-4.png',
  BASE_URL + 'cards/bastos-5.png',
  BASE_URL + 'cards/bastos-6.png',
  BASE_URL + 'cards/bastos-7.png',
  BASE_URL + 'cards/bastos-10.png',
  BASE_URL + 'cards/bastos-11.png',
  BASE_URL + 'cards/bastos-12.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip cross-origin requests
  if (!request.url.startsWith(self.location.origin)) return;
  
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version
        return cachedResponse;
      }
      
      // Fetch from network and cache
      return fetch(request).then((networkResponse) => {
        // Don't cache non-successful responses
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        
        // Clone the response
        const responseToCache = networkResponse.clone();
        
        // Cache the new resource
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        
        return networkResponse;
      }).catch(() => {
        // If offline and not in cache, return a fallback for navigation
        if (request.mode === 'navigate') {
          return caches.match(BASE_URL + 'index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

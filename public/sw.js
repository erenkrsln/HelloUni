// Service Worker für HelloUni PWA
const CACHE_NAME = 'hellouni-v1';
const urlsToCache = [
  '/',
  '/feed',
  '/manifest.json',
];

// Install Event - Cache wichtige Ressourcen
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache geöffnet');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: Fehler beim Caching', error);
      })
  );
  self.skipWaiting();
});

// Activate Event - Alte Caches löschen
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Alten Cache löschen', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch Event - Netzwerk-First Strategie mit Fallback
self.addEventListener('fetch', (event) => {
  // Nur GET-Requests cachen
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip Cross-Origin Requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Prüfe ob die Antwort gültig ist
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone die Response
        const responseToCache = response.clone();

        // Cache die Response
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        // Fallback: Versuche aus dem Cache zu laden
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          // Wenn auch im Cache nicht gefunden, zeige Offline-Seite
          if (event.request.destination === 'document') {
            return caches.match('/');
          }
        });
      })
  );
});





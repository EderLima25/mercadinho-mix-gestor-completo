const CACHE_NAME = 'mercadinho-mix-v4';
const STATIC_CACHE = 'mercadinho-static-v4';

// Only cache essential static files that don't change
const staticUrlsToCache = [
  '/',
  '/manifest.json',
  '/Mercadinho.jpg',
  '/favicon.ico'
];

// Install event - cache only essential static resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static resources');
        return cache.addAll(staticUrlsToCache);
      })
      .catch((error) => {
        console.error('Cache failed:', error);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients immediately
      self.clients.claim()
    ]).then(() => {
      console.log('Service Worker activated and claimed clients');
      // Notify all clients that SW is ready
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_ACTIVATED' });
        });
      });
    })
  );
});

// Fetch event - intelligent caching strategy
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Skip API calls to Supabase - let them fail naturally when offline
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // If we have a cached response, return it
        if (cachedResponse) {
          console.log('Serving from cache:', event.request.url);
          return cachedResponse;
        }
        
        // Try to fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Don't cache dynamic files with hashes (they change on each build)
            const url = new URL(event.request.url);
            const pathname = url.pathname;
            
            // Skip caching files with hashes in their names
            if (pathname.match(/\-[a-zA-Z0-9]{8,}\.(js|css)$/)) {
              console.log('Skipping cache for hashed file:', pathname);
              return response;
            }

            // Cache static resources
            if (pathname.endsWith('.jpg') || 
                pathname.endsWith('.png') || 
                pathname.endsWith('.ico') || 
                pathname.endsWith('.json') ||
                pathname === '/') {
              
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }

            return response;
          })
          .catch((error) => {
            console.log('Fetch failed, checking cache:', error);
            
            // For navigation requests, try to return the cached index page
            if (event.request.mode === 'navigate') {
              return caches.match('/').then(response => {
                if (response) {
                  return response;
                }
                return new Response('Aplicativo offline - Verifique sua conexão', {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'text/html' }
                });
              });
            }
            
            return new Response('Offline - Please check your connection', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  console.log('SW received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Handle cache refresh requests
  if (event.data && event.data.type === 'REFRESH_CACHE') {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.delete(cacheName);
      });
    });
  }

  // Handle ping requests to check if SW is alive
  if (event.data && event.data.type === 'PING') {
    event.ports[0].postMessage({ type: 'PONG' });
  }
});

// Background sync for offline actions (if supported)
if ('sync' in self.registration) {
  self.addEventListener('sync', (event) => {
    console.log('Background sync triggered:', event.tag);
    
    if (event.tag === 'offline-sync') {
      event.waitUntil(
        // Notify the main thread to process offline queue
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'PROCESS_OFFLINE_QUEUE' });
          });
        })
      );
    }
  });
}

console.log('Service Worker script loaded');
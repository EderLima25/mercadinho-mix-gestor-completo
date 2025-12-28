const CACHE_NAME = 'mercadinho-mix-v3';
const STATIC_CACHE = 'mercadinho-static-v3';

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

  // Skip API calls to Supabase
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
              return caches.match('/');
            }
            
            return new Response('Offline - Please check your connection', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
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
    }).then(() => {
      // Claim all clients immediately
      return self.clients.claim();
    })
  );
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
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
});
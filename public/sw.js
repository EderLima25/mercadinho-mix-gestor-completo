const CACHE_NAME = 'mercadinho-mix-v6';
const STATIC_CACHE = 'mercadinho-static-v6';

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
    Promise.resolve()
      .then(() => {
        console.log('Service Worker installation starting');
        return caches.open(STATIC_CACHE);
      })
      .then((cache) => {
        console.log('Caching static resources');
        // Cache resources individually to handle failures gracefully
        return Promise.allSettled(
          staticUrlsToCache.map(url => {
            return fetch(url)
              .then(response => {
                if (response.ok) {
                  return cache.put(url, response);
                }
                throw new Error(`Failed to fetch ${url}: ${response.status}`);
              })
              .catch(error => {
                console.warn(`Failed to cache ${url}:`, error.message);
                return null;
              });
          })
        );
      })
      .then(() => {
        console.log('Static resources cached successfully');
      })
      .catch((error) => {
        console.error('Cache installation failed:', error);
        // Don't fail the installation even if caching fails
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

  const url = new URL(event.request.url);
  const pathname = url.pathname;

  // Skip requests for hashed files - they change on each build
  if (pathname.match(/\-[a-zA-Z0-9]{8,}\.(js|css)$/)) {
    // For hashed files, try network first, no caching, but handle errors gracefully
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Return successful responses as-is
          if (response.ok) {
            return response;
          }
          throw new Error(`HTTP ${response.status}`);
        })
        .catch((error) => {
          console.log('Hashed file fetch failed:', pathname, error.message);
          // Return empty response for CSS files to prevent blocking
          if (pathname.endsWith('.css')) {
            return new Response('/* CSS file not available offline */', {
              status: 200,
              headers: { 'Content-Type': 'text/css' }
            });
          }
          // For JS files, return empty script
          if (pathname.endsWith('.js')) {
            return new Response('// JS file not available offline', {
              status: 200,
              headers: { 'Content-Type': 'application/javascript' }
            });
          }
          // For other files, let them fail
          throw error;
        })
    );
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
                })
                .catch((cacheError) => {
                  console.log('Cache put failed:', cacheError);
                });
            }

            return response;
          })
          .catch((error) => {
            console.log('Fetch failed for:', pathname, error.message);
            
            // For navigation requests, try to return the cached index page
            if (event.request.mode === 'navigate') {
              return caches.match('/').then(response => {
                if (response) {
                  return response;
                }
                // Return a simple offline page
                return new Response(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Mercadinho Mix - Offline</title>
                      <meta charset="utf-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1">
                      <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        .offline-message { color: #666; }
                      </style>
                    </head>
                    <body>
                      <h1>Mercadinho Mix</h1>
                      <div class="offline-message">
                        <p>Aplicativo funcionando offline</p>
                        <p>Algumas funcionalidades podem estar limitadas</p>
                      </div>
                    </body>
                  </html>
                `, {
                  status: 200,
                  headers: { 'Content-Type': 'text/html' }
                });
              });
            }
            
            // For CSS files, return empty CSS to prevent blocking
            if (pathname.endsWith('.css')) {
              return new Response('/* CSS file not available offline */', {
                status: 200,
                headers: { 'Content-Type': 'text/css' }
              });
            }
            
            // For JS files, return empty script
            if (pathname.endsWith('.js')) {
              return new Response('// JS file not available offline', {
                status: 200,
                headers: { 'Content-Type': 'application/javascript' }
              });
            }
            
            // For other requests, let them fail gracefully
            return new Response('Resource not available offline', {
              status: 404,
              statusText: 'Not Found'
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
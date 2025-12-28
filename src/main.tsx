import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { logPWAStatus, clearPWACache, registerServiceWorker, testServiceWorkerCommunication } from "./utils/pwaUtils";
import { LocalCache } from "./utils/localCache";

// Log PWA status for debugging
logPWAStatus();

// Add global functions for debugging
(window as any).clearPWACache = clearPWACache;
(window as any).testSW = testServiceWorkerCommunication;
(window as any).clearLocalCache = async () => {
  const cache = LocalCache.getInstance();
  await cache.clearAllData();
  console.log('Local cache cleared');
};
(window as any).checkLocalCache = async () => {
  const cache = LocalCache.getInstance();
  const products = await cache.getProducts();
  const pendingSync = await cache.getPendingSyncItems();
  const offlineSales = await cache.getOfflineSales();
  
  console.log('=== Local Cache Status ===');
  console.log('Products:', products.length);
  console.log('Pending sync items:', pendingSync.length);
  console.log('Offline sales:', offlineSales.length);
  console.log('========================');
  
  return { products, pendingSync, offlineSales };
};

(window as any).debugOfflineStatus = async () => {
  const cache = LocalCache.getInstance();
  const products = await cache.getProducts();
  const pendingSync = await cache.getPendingSyncItems();
  
  console.log('=== Offline Debug Status ===');
  console.log('Navigator online:', navigator.onLine);
  console.log('Cached products:', products.length);
  console.log('Pending sync items:', pendingSync.length);
  console.log('Service Worker status:', await (window as any).testSW());
  
  // Test cache functionality
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    console.log('Available caches:', cacheNames);
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      console.log(`Cache ${cacheName}:`, keys.length, 'items');
    }
  }
  
  console.log('==========================');
};

console.log('Debug functions available:');
console.log('- clearPWACache() - Clear all caches and reload');
console.log('- testSW() - Test service worker communication');
console.log('- clearLocalCache() - Clear IndexedDB cache');
console.log('- checkLocalCache() - Check local cache status');
console.log('- debugOfflineStatus() - Debug offline detection status');

// Register service worker for offline functionality
window.addEventListener('load', async () => {
  const registration = await registerServiceWorker();
  
  if (registration) {
    console.log('Service Worker registered successfully');
    
    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60000); // Check every minute
  } else {
    console.warn('Service Worker registration failed');
  }
});

createRoot(document.getElementById("root")!).render(<App />);

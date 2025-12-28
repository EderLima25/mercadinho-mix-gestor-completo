// PWA utility functions

export const isPWAInstalled = (): boolean => {
  // Check if running in standalone mode
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // Check for iOS Safari standalone mode
  if ((window.navigator as any).standalone === true) {
    return true;
  }
  
  return false;
};

export const isPWASupported = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

export const getInstallPromptStatus = (): string => {
  if (isPWAInstalled()) {
    return 'installed';
  }
  
  if (!isPWASupported()) {
    return 'not_supported';
  }
  
  return 'available';
};

export const checkServiceWorkerStatus = async (): Promise<string> => {
  if (!('serviceWorker' in navigator)) {
    return 'not_supported';
  }
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return 'not_registered';
    }
    
    if (registration.active) {
      return 'active';
    }
    
    if (registration.installing) {
      return 'installing';
    }
    
    if (registration.waiting) {
      return 'waiting';
    }
    
    return 'registered';
  } catch (error) {
    console.error('Error checking service worker status:', error);
    return 'error';
  }
};

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported');
    return null;
  }

  try {
    console.log('Registering service worker...');
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none' // Always check for updates
    });

    console.log('SW registered successfully:', registration);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      console.log('New service worker found');
      const newWorker = registration.installing;
      
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          console.log('SW state changed:', newWorker.state);
          
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('New service worker installed, prompting for update');
            // Optionally show update notification to user
            if (confirm('Nova versão disponível. Atualizar agora?')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        });
      }
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('Message from SW:', event.data);
      
      if (event.data.type === 'SW_ACTIVATED') {
        console.log('Service Worker activated');
      }
      
      if (event.data.type === 'PROCESS_OFFLINE_QUEUE') {
        // Trigger offline queue processing
        window.dispatchEvent(new CustomEvent('processOfflineQueue'));
      }
    });

    // Handle controller change (when new SW takes over)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('Service Worker controller changed');
      window.location.reload();
    });

    return registration;
  } catch (error) {
    console.error('SW registration failed:', error);
    return null;
  }
};

export const logPWAStatus = async (): Promise<void> => {
  console.log('=== PWA Status ===');
  console.log('PWA Installed:', isPWAInstalled());
  console.log('PWA Supported:', isPWASupported());
  console.log('Install Status:', getInstallPromptStatus());
  console.log('Service Worker Status:', await checkServiceWorkerStatus());
  console.log('User Agent:', navigator.userAgent);
  console.log('Display Mode:', window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser');
  console.log('==================');
};

export const clearPWACache = async (): Promise<void> => {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('All caches cleared');
      
      // Send message to service worker to refresh
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'REFRESH_CACHE'
        });
      }
      
      // Reload the page to get fresh content
      window.location.reload();
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
};

// Test service worker communication
export const testServiceWorkerCommunication = async (): Promise<boolean> => {
  if (!navigator.serviceWorker.controller) {
    return false;
  }

  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data.type === 'PONG');
    };

    navigator.serviceWorker.controller.postMessage(
      { type: 'PING' }, 
      [messageChannel.port2]
    );

    // Timeout after 5 seconds
    setTimeout(() => resolve(false), 5000);
  });
};
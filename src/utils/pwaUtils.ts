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
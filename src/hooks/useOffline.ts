import { useState, useEffect } from 'react';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<any[]>(() => {
    // Initialize with data from localStorage
    try {
      return JSON.parse(localStorage.getItem('offlineQueue') || '[]');
    } catch {
      return [];
    }
  });

  console.log('useOffline - isOnline:', isOnline, 'navigator.onLine:', navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      console.log('Network status changed: ONLINE');
      setIsOnline(true);
      // Process offline queue when back online
      processOfflineQueue();
    };

    const handleOffline = () => {
      console.log('Network status changed: OFFLINE');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addToOfflineQueue = (action: any) => {
    const newAction = { ...action, timestamp: Date.now() };
    setOfflineQueue(prev => [...prev, newAction]);
    
    // Save to localStorage for persistence
    try {
      const queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
      queue.push(newAction);
      localStorage.setItem('offlineQueue', JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving to offline queue:', error);
    }
  };

  const processOfflineQueue = async () => {
    const queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
    
    for (const action of queue) {
      try {
        // Process each queued action
        await processQueuedAction(action);
      } catch (error) {
        console.error('Error processing queued action:', error);
      }
    }
    
    // Clear queue after processing
    localStorage.removeItem('offlineQueue');
    setOfflineQueue([]);
  };

  const processQueuedAction = async (action: any) => {
    // This would be implemented based on your specific needs
    // For example, sync sales, product updates, etc.
    console.log('Processing queued action:', action);
  };

  return {
    isOnline,
    offlineQueue,
    addToOfflineQueue,
    processOfflineQueue
  };
}
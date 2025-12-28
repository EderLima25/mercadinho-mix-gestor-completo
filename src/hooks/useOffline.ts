import { useState, useEffect } from 'react';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Process offline queue when back online
      processOfflineQueue();
    };

    const handleOffline = () => {
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
    setOfflineQueue(prev => [...prev, { ...action, timestamp: Date.now() }]);
    // Save to localStorage for persistence
    const queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
    queue.push({ ...action, timestamp: Date.now() });
    localStorage.setItem('offlineQueue', JSON.stringify(queue));
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
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OfflineAction {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retries?: number;
}

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<OfflineAction[]>(() => {
    // Initialize with data from localStorage
    try {
      return JSON.parse(localStorage.getItem('offlineQueue') || '[]');
    } catch {
      return [];
    }
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastLoggedStatus, setLastLoggedStatus] = useState<boolean | null>(null);

  // Removed excessive logging - only log on state changes

  // Improved network detection
  const checkNetworkStatus = useCallback(async () => {
    // First check navigator.onLine - if it says offline, we're definitely offline
    if (!navigator.onLine) {
      return false;
    }
    
    try {
      // Try to make a simple request to check actual connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // Reduced timeout
      
      const response = await fetch('/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      if (lastLoggedStatus !== true) {
        setLastLoggedStatus(true);
      }
      const actuallyOnline = await checkNetworkStatus();
      if (actuallyOnline) {
        setIsOnline(true);
        setTimeout(() => processOfflineQueue(), 1000);
      }
    };

    const handleOffline = () => {
      if (lastLoggedStatus !== false) {
        setLastLoggedStatus(false);
      }
      setIsOnline(false);
    };

    // Check initial status
    checkNetworkStatus().then(setIsOnline);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connectivity check - reduced frequency and logging
    const intervalId = setInterval(async () => {
      const actualStatus = await checkNetworkStatus();
      const navigatorStatus = navigator.onLine;
      
      // Use the more restrictive status (if either says offline, we're offline)
      const finalStatus = actualStatus && navigatorStatus;
      
      if (finalStatus !== isOnline) {
        if (finalStatus && lastLoggedStatus !== true) {
          setLastLoggedStatus(true);
        } else if (!finalStatus && lastLoggedStatus !== false) {
          setLastLoggedStatus(false);
        }
        setIsOnline(finalStatus);
        if (finalStatus && offlineQueue.length > 0) {
          setTimeout(() => processOfflineQueue(), 1000);
        }
      }
    }, 20000); // Increased to 20 seconds to reduce frequency even more

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [checkNetworkStatus, isOnline, offlineQueue.length, lastLoggedStatus]);

  const addToOfflineQueue = useCallback((action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
    const newAction: OfflineAction = { 
      ...action, 
      id: `${action.type}_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      retries: 0
    };
    
    setOfflineQueue(prev => {
      const updated = [...prev, newAction];
      try {
        localStorage.setItem('offlineQueue', JSON.stringify(updated));
      } catch {
        // Silent fail for storage errors
      }
      return updated;
    });
  }, []);

  const processOfflineQueue = useCallback(async () => {
    if (isSyncing || !isOnline || offlineQueue.length === 0) {
      return;
    }

    setIsSyncing(true);
    
    const queue = [...offlineQueue];
    const processedIds: string[] = [];
    
    for (const action of queue) {
      try {
        await processQueuedAction(action);
        processedIds.push(action.id);
      } catch {
        const retries = (action.retries || 0) + 1;
        if (retries < 3) {
          setOfflineQueue(prev => prev.map(item => 
            item.id === action.id ? { ...item, retries } : item
          ));
        } else {
          processedIds.push(action.id);
        }
      }
    }
    
    if (processedIds.length > 0) {
      setOfflineQueue(prev => {
        const updated = prev.filter(item => !processedIds.includes(item.id));
        try {
          localStorage.setItem('offlineQueue', JSON.stringify(updated));
        } catch {
          // Silent fail
        }
        return updated;
      });
    }
    
    setIsSyncing(false);
  }, [isSyncing, isOnline, offlineQueue]);

  const processQueuedAction = async (action: OfflineAction) => {
    switch (action.type) {
      case 'sale':
        await processSaleSync(action.data);
        break;
      case 'addProduct':
        await processProductAdd(action.data);
        break;
      case 'updateProduct':
        await processProductUpdate(action.data);
        break;
      case 'deleteProduct':
        await processProductDelete(action.data);
        break;
      case 'updateStock':
        await processStockUpdate(action.data);
        break;
      default:
        console.warn('Unknown action type:', action.type);
    }
  };

  const processSaleSync = async (saleData: any) => {
    // Create sale online
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        user_id: saleData.user_id,
        total: saleData.total,
        payment_method: saleData.payment_method,
      })
      .select()
      .single();
    
    if (saleError) throw saleError;

    // Create sale items
    const saleItems = saleData.items.map((item: any) => ({
      sale_id: sale.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    }));

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);
    
    if (itemsError) throw itemsError;

    // Update stock for each product
    for (const item of saleData.items) {
      const { data: product } = await supabase
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .single();
      
      if (product) {
        await supabase
          .from('products')
          .update({ stock: product.stock - item.quantity })
          .eq('id', item.product_id);
      }
    }
  };

  const processProductAdd = async (productData: any) => {
    const { error } = await supabase
      .from('products')
      .insert(productData);
    
    if (error) throw error;
  };

  const processProductUpdate = async (updateData: any) => {
    const { id, ...updates } = updateData;
    const { error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id);
    
    if (error) throw error;
  };

  const processProductDelete = async (deleteData: any) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', deleteData.id);
    
    if (error) throw error;
  };

  const processStockUpdate = async (stockData: any) => {
    const { error } = await supabase
      .from('products')
      .update({ stock: stockData.stock })
      .eq('id', stockData.id);
    
    if (error) throw error;
  };

  const clearOfflineQueue = useCallback(() => {
    setOfflineQueue([]);
    localStorage.removeItem('offlineQueue');
  }, []);

  return {
    isOnline,
    offlineQueue,
    isSyncing,
    addToOfflineQueue,
    processOfflineQueue,
    clearOfflineQueue,
  };
}
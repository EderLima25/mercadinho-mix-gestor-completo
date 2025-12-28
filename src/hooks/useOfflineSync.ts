import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OfflineAction {
  id: string;
  type: 'sale' | 'product' | 'category';
  action: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

const OFFLINE_QUEUE_KEY = 'mercadinho-offline-queue';
const OFFLINE_CACHE_KEY = 'mercadinho-offline-cache';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const { toast } = useToast();

  // Load pending actions from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (stored) {
        setPendingActions(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading offline queue:', error);
    }
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('App is online');
      setIsOnline(true);
      syncPendingActions();
    };

    const handleOffline = () => {
      console.log('App is offline');
      setIsOnline(false);
      toast({
        title: 'Modo Offline',
        description: 'Você está trabalhando offline. As alterações serão sincronizadas quando a conexão for restaurada.',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Add action to offline queue
  const addToQueue = useCallback((action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
    const newAction: OfflineAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    setPendingActions(prev => {
      const updated = [...prev, newAction];
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updated));
      return updated;
    });

    return newAction.id;
  }, []);

  // Cache data for offline use
  const cacheData = useCallback((key: string, data: any) => {
    try {
      const cache = JSON.parse(localStorage.getItem(OFFLINE_CACHE_KEY) || '{}');
      cache[key] = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }, []);

  // Get cached data
  const getCachedData = useCallback((key: string, maxAge: number = 24 * 60 * 60 * 1000) => {
    try {
      const cache = JSON.parse(localStorage.getItem(OFFLINE_CACHE_KEY) || '{}');
      const cached = cache[key];
      
      if (cached && Date.now() - cached.timestamp < maxAge) {
        return cached.data;
      }
    } catch (error) {
      console.error('Error getting cached data:', error);
    }
    return null;
  }, []);

  // Sync pending actions when online
  const syncPendingActions = useCallback(async () => {
    if (!isOnline || isSyncing || pendingActions.length === 0) return;

    setIsSyncing(true);
    let successCount = 0;
    let failedActions: OfflineAction[] = [];

    for (const action of pendingActions) {
      try {
        await processAction(action);
        successCount++;
      } catch (error) {
        console.error('Error syncing action:', error);
        failedActions.push(action);
      }
    }

    // Update pending actions
    setPendingActions(failedActions);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(failedActions));

    setIsSyncing(false);

    if (successCount > 0) {
      toast({
        title: 'Sincronização Concluída',
        description: `${successCount} ${successCount === 1 ? 'ação sincronizada' : 'ações sincronizadas'} com sucesso.`,
      });
    }

    if (failedActions.length > 0) {
      toast({
        title: 'Algumas ações falharam',
        description: `${failedActions.length} ${failedActions.length === 1 ? 'ação' : 'ações'} não puderam ser sincronizadas.`,
        variant: 'destructive',
      });
    }
  }, [isOnline, isSyncing, pendingActions, toast]);

  // Process individual action
  const processAction = async (action: OfflineAction) => {
    const tableMap: Record<string, string> = {
      sale: 'sales',
      product: 'products',
      category: 'categories',
    };

    const table = tableMap[action.type];
    if (!table) throw new Error(`Unknown action type: ${action.type}`);

    switch (action.action) {
      case 'insert':
        const { error: insertError } = await supabase
          .from(table as any)
          .insert(action.data);
        if (insertError) throw insertError;
        break;

      case 'update':
        const { error: updateError } = await supabase
          .from(table as any)
          .update(action.data)
          .eq('id', action.data.id);
        if (updateError) throw updateError;
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from(table as any)
          .delete()
          .eq('id', action.data.id);
        if (deleteError) throw deleteError;
        break;
    }
  };

  // Clear all cached data
  const clearCache = useCallback(() => {
    localStorage.removeItem(OFFLINE_CACHE_KEY);
    toast({
      title: 'Cache Limpo',
      description: 'Todos os dados em cache foram removidos.',
    });
  }, [toast]);

  // Clear pending actions
  const clearQueue = useCallback(() => {
    setPendingActions([]);
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingActions,
    pendingCount: pendingActions.length,
    addToQueue,
    cacheData,
    getCachedData,
    syncPendingActions,
    clearCache,
    clearQueue,
  };
}

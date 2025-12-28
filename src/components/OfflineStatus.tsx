import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, CloudOff, CheckCircle, User, Loader2 } from 'lucide-react';
import { useOffline } from '@/hooks/useOffline';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function OfflineStatus() {
  const { isOnline, offlineQueue, isSyncing } = useOffline();
  const { isOfflineMode, user } = useAuth();
  const [showStatus, setShowStatus] = useState(false);
  const [lastOnlineStatus, setLastOnlineStatus] = useState(isOnline);

  useEffect(() => {
    if (isOnline !== lastOnlineStatus) {
      setShowStatus(true);
      setLastOnlineStatus(isOnline);
      
      // Hide status after 5 seconds (increased for better visibility)
      const timer = setTimeout(() => {
        setShowStatus(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isOnline, lastOnlineStatus]);

  // Show status when syncing starts
  useEffect(() => {
    if (isSyncing) {
      setShowStatus(true);
      
      const timer = setTimeout(() => {
        setShowStatus(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isSyncing]);

  return (
    <>
      {/* Persistent offline indicator */}
      {!isOnline && !showStatus && (
        <div className="fixed top-20 right-4 z-50 max-w-sm lg:top-20 lg:right-4">
          <Alert className="bg-yellow-50 border-yellow-200 shadow-lg">
            <CloudOff className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Modo Offline
              {offlineQueue.length > 0 && (
                <span className="block text-xs mt-1">
                  {offlineQueue.length} ação{offlineQueue.length !== 1 ? 'ões' : ''} pendente{offlineQueue.length !== 1 ? 's' : ''}
                </span>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Status change notification */}
      <AnimatePresence>
        {showStatus && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-32 left-1/2 transform -translate-x-1/2 z-50 lg:top-28"
          >
            <Alert className={`shadow-lg ${
              isSyncing
                ? 'bg-blue-50 border-blue-200'
                : isOnline 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
            }`}>
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  <AlertDescription className="text-blue-800">
                    Sincronizando {offlineQueue.length} ação{offlineQueue.length !== 1 ? 'ões' : ''}...
                  </AlertDescription>
                </>
              ) : isOnline ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Conectado
                    {offlineQueue.length > 0 && ' - Sincronizando dados...'}
                  </AlertDescription>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    Sem conexão - Funcionando offline
                  </AlertDescription>
                </>
              )}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection status indicator */}
      <div className="fixed bottom-4 right-4 z-40 lg:bottom-4 lg:right-4 md:bottom-20 md:right-4 sm:bottom-16 sm:right-4">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm shadow-lg transition-all duration-200 ${
          isSyncing
            ? 'bg-blue-100 text-blue-800 border border-blue-200'
            : isOnline 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
        }`}>
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isOnline ? (
            <Wifi className="h-4 w-4" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {isSyncing ? 'Sincronizando' : isOnline ? 'Online' : 'Offline'}
          </span>
          {isOfflineMode && user && (
            <>
              <User className="h-3 w-3 ml-1" />
              <span className="text-xs hidden md:inline">Sessão Local</span>
            </>
          )}
          {!isOnline && offlineQueue.length > 0 && (
            <span className="bg-yellow-200 text-yellow-800 text-xs px-1.5 py-0.5 rounded-full ml-1">
              {offlineQueue.length}
            </span>
          )}
        </div>
      </div>
    </>
  );
}
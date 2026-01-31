import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { OfflineStatus } from "@/components/OfflineStatus";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { useOffline } from "@/hooks/useOffline";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Install from "./pages/Install";
import OfflineSales from "./pages/OfflineSales";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const { processOfflineQueue } = useOffline();

  useEffect(() => {
    const handleProcessOfflineQueue = () => {
      processOfflineQueue();
    };

    window.addEventListener('processOfflineQueue', handleProcessOfflineQueue);

    return () => {
      window.removeEventListener('processOfflineQueue', handleProcessOfflineQueue);
    };
  }, [processOfflineQueue]);

  return (
    <>
      <OfflineStatus />
      <PWAInstallPrompt />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/install" element={<Install />} />
          <Route path="/offline-sales" element={<OfflineSales />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

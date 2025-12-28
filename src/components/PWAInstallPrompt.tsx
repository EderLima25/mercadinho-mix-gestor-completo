import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Smartphone, Monitor } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isPWAInstalled } from '@/utils/pwaUtils';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('beforeinstallprompt event fired');
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Save the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setShowPrompt(false);
      setDeferredPrompt(null);
      toast({
        title: 'App instalado!',
        description: 'Mercadinho Mix foi instalado com sucesso.',
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if app is already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      console.log('App is running in standalone mode');
      setShowPrompt(false);
    }

    // Show manual instructions after 5 seconds if no prompt appeared (desktop)
    // or after 15 seconds on mobile
    const isDesktop = window.innerWidth >= 768;
    const delay = isDesktop ? 5000 : 15000;
    
    const timer = setTimeout(() => {
      if (!deferredPrompt && !showPrompt && !isPWAInstalled()) {
        setShowManualInstructions(true);
      }
    }, delay);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, [toast, deferredPrompt, showPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    await deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User response to the install prompt: ${outcome}`);
    
    if (outcome === 'accepted') {
      toast({
        title: 'Instalando...',
        description: 'O app está sendo instalado.',
      });
    }
    
    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleManualInstall = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let instructions = '';
    
    if (isIOS) {
      instructions = 'No Safari: toque no ícone de compartilhar e selecione "Adicionar à Tela de Início"';
    } else if (isAndroid) {
      instructions = 'No Chrome: toque no menu (⋮) e selecione "Adicionar à tela inicial"';
    } else {
      instructions = 'No Chrome/Edge: clique no ícone de instalação na barra de endereços ou vá no menu > "Instalar Mercadinho Mix"';
    }
    
    toast({
      title: 'Como instalar',
      description: instructions,
    });
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowManualInstructions(false);
    // Don't clear deferredPrompt in case user changes mind
  };

  // Show automatic prompt
  if (showPrompt && deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Instalar Mercadinho Mix</h3>
              <p className="text-xs text-gray-600 mt-1">
                Instale o app para acesso rápido e funcionalidade offline.
              </p>
              <div className="flex gap-2 mt-3">
                <Button 
                  size="sm" 
                  onClick={handleInstallClick}
                  className="text-xs"
                >
                  Instalar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDismiss}
                  className="text-xs"
                >
                  Agora não
                </Button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show manual instructions
  if (showManualInstructions) {
    const isDesktop = window.innerWidth >= 768;
    
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
        <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {isDesktop ? (
                <Monitor className="h-6 w-6 text-blue-600" />
              ) : (
                <Smartphone className="h-6 w-6 text-blue-600" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-blue-900">Instalar como App</h3>
              <p className="text-xs text-blue-700 mt-1">
                {isDesktop 
                  ? 'Procure o ícone de instalação na barra de endereços do seu navegador.'
                  : 'Use o menu do navegador para adicionar à tela inicial.'
                }
              </p>
              <div className="flex gap-2 mt-3">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleManualInstall}
                  className="text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  Ver instruções
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleDismiss}
                  className="text-xs text-blue-600"
                >
                  Dispensar
                </Button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-blue-400 hover:text-blue-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
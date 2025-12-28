import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { POSTerminal } from '@/components/POSTerminal';
import { ProductManager } from '@/components/ProductManager';
import { InventoryView } from '@/components/InventoryView';
import { ImportExport } from '@/components/ImportExport';
import { Reports } from '@/components/Reports';
import { UserManagement } from '@/components/UserManagement';
import { Settings } from '@/components/Settings';
import { SupplierManager } from '@/components/SupplierManager';
import { CashRegisterManager } from '@/components/CashRegisterManager';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, User, Download } from 'lucide-react';
import { isPWAInstalled } from '@/utils/pwaUtils';
import { useToast } from '@/hooks/use-toast';

type View = 'dashboard' | 'pos' | 'products' | 'inventory' | 'import' | 'reports' | 'users' | 'settings' | 'suppliers' | 'cash';

const Index = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    // Show install button if PWA is not installed
    const checkInstallability = () => {
      const isInstalled = isPWAInstalled();
      const isDesktop = window.innerWidth >= 768;
      
      // On desktop, always show the button if not installed
      // On mobile, show only if no automatic prompt appeared
      if (!isInstalled) {
        if (isDesktop) {
          setShowInstallButton(true);
        } else {
          // On mobile, show button after 5 seconds if no prompt appeared
          setTimeout(() => {
            setShowInstallButton(true);
          }, 5000);
        }
      }
    };

    checkInstallability();
    
    // Re-check on resize
    window.addEventListener('resize', checkInstallability);
    return () => window.removeEventListener('resize', checkInstallability);
  }, []);

  const handleInstallClick = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent);
    const isEdge = /Edg/.test(navigator.userAgent);
    
    let instructions = '';
    
    if (isIOS) {
      instructions = 'No Safari: toque no ícone de compartilhar (↗) e selecione "Adicionar à Tela de Início"';
    } else if (isAndroid) {
      instructions = 'No Chrome: toque no menu (⋮) e selecione "Adicionar à tela inicial"';
    } else if (isChrome || isEdge) {
      instructions = 'Procure o ícone de instalação (⬇) na barra de endereços (lado direito) ou vá no menu > "Instalar Mercadinho Mix"';
    } else {
      instructions = 'Use Chrome ou Edge para melhor suporte a PWA. No Firefox: Menu > "Instalar este site como app"';
    }
    
    // Log debug info
    console.log('=== PWA Install Debug ===');
    console.log('User Agent:', navigator.userAgent);
    console.log('Is Chrome:', isChrome);
    console.log('Is Edge:', isEdge);
    console.log('Is iOS:', isIOS);
    console.log('Is Android:', isAndroid);
    console.log('PWA Installed:', isPWAInstalled());
    console.log('========================');
    
    toast({
      title: 'Como instalar o app',
      description: instructions,
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'pos': return <POSTerminal />;
      case 'products': return <ProductManager />;
      case 'inventory': return <InventoryView />;
      case 'import': return <ImportExport />;
      case 'reports': return <Reports />;
      case 'users': return <UserManagement />;
      case 'settings': return <Settings />;
      case 'suppliers': return <SupplierManager />;
      case 'cash': return <CashRegisterManager />;
      default: return <Dashboard />;
    }
  };

  const getPageTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Dashboard';
      case 'pos': return 'Ponto de Venda';
      case 'products': return 'Gerenciar Produtos';
      case 'inventory': return 'Controle de Estoque';
      case 'import': return 'Importar / Exportar';
      case 'reports': return 'Relatórios';
      case 'users': return 'Gerenciar Usuários';
      case 'settings': return 'Configurações';
      case 'suppliers': return 'Fornecedores';
      case 'cash': return 'Controle de Caixa';
      default: return 'Dashboard';
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      
      <main className="flex-1 min-h-screen overflow-auto lg:ml-0">
        <div className="container mx-auto p-6 lg:p-8 min-h-full">
          <header className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden bg-white shadow-sm">
                <img 
                  src="/Mercadinho.jpg" 
                  alt="Mercadinho Mix" 
                  className="h-full w-full object-cover"
                />
              </div>
              <h1 className="text-2xl font-bold lg:text-3xl">{getPageTitle()}</h1>
            </div>
            <div className="flex items-center gap-3">
              {showInstallButton && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleInstallClick}
                  className="hidden sm:flex"
                  title="Instalar como app"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Instalar App
                </Button>
              )}
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </header>
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default Index;

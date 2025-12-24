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
import { LogOut, User } from 'lucide-react';

type View = 'dashboard' | 'pos' | 'products' | 'inventory' | 'import' | 'reports' | 'users' | 'settings' | 'suppliers' | 'cash';

const Index = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

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
      
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 lg:p-8">
          <header className="mb-8 flex items-center justify-between">
            <h1 className="text-2xl font-bold lg:text-3xl">{getPageTitle()}</h1>
            <div className="flex items-center gap-3">
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

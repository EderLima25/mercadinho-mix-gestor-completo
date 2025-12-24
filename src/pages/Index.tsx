import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { POSTerminal } from '@/components/POSTerminal';
import { ProductManager } from '@/components/ProductManager';
import { InventoryView } from '@/components/InventoryView';
import { ImportExport } from '@/components/ImportExport';

type View = 'dashboard' | 'pos' | 'products' | 'inventory' | 'import' | 'settings';

const Index = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'pos':
        return <POSTerminal />;
      case 'products':
        return <ProductManager />;
      case 'inventory':
        return <InventoryView />;
      case 'import':
        return <ImportExport />;
      default:
        return <Dashboard />;
    }
  };

  const getPageTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'Dashboard';
      case 'pos':
        return 'Ponto de Venda';
      case 'products':
        return 'Gerenciar Produtos';
      case 'inventory':
        return 'Controle de Estoque';
      case 'import':
        return 'Importar / Exportar';
      default:
        return 'Dashboard';
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 lg:p-8">
          <header className="mb-8">
            <h1 className="text-2xl font-bold lg:text-3xl">{getPageTitle()}</h1>
          </header>
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default Index;

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Store, 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Settings,
  Menu,
  X,
  Upload,
  Box,
  FileText,
  Users,
  Building2,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type View = 'dashboard' | 'pos' | 'products' | 'inventory' | 'import' | 'reports' | 'users' | 'settings' | 'suppliers' | 'cash';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const menuItems = [
  { id: 'dashboard' as View, label: 'Dashboard', icon: BarChart3 },
  { id: 'pos' as View, label: 'PDV', icon: ShoppingCart },
  { id: 'cash' as View, label: 'Caixa', icon: DollarSign },
  { id: 'products' as View, label: 'Produtos', icon: Package },
  { id: 'suppliers' as View, label: 'Fornecedores', icon: Building2 },
  { id: 'inventory' as View, label: 'Estoque', icon: Box },
  { id: 'reports' as View, label: 'Relatórios', icon: FileText },
  { id: 'users' as View, label: 'Usuários', icon: Users },
  { id: 'import' as View, label: 'Importar/Exportar', icon: Upload },
  { id: 'settings' as View, label: 'Configurações', icon: Settings },
];

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 lg:hidden"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X /> : <Menu />}
      </Button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: isCollapsed ? 80 : 280,
          x: isMobileOpen || window.innerWidth >= 1024 ? 0 : -280,
        }}
        className={cn(
          'fixed left-0 top-0 z-40 flex h-full min-h-screen flex-col border-r bg-slate-800 transition-all duration-300',
          'lg:sticky lg:translate-x-0 lg:h-screen lg:min-h-screen'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-700 px-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden bg-white">
            <img 
              src="/Mercadinho.jpg" 
              alt="Mercadinho Mix" 
              className="h-full w-full object-cover"
            />
          </div>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col"
            >
              <span className="text-lg font-bold text-white">Mercadinho</span>
              <span className="text-xs font-medium text-orange-400">Mix</span>
            </motion.div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <motion.button
                key={item.id}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onViewChange(item.id);
                  setIsMobileOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors',
                  isActive
                    ? 'bg-orange-500 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                )}
              >
                <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-white' : 'text-slate-400')} />
                {!isCollapsed && (
                  <span className="font-medium">{item.label}</span>
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Collapse Toggle (Desktop) */}
        <div className="hidden border-t border-slate-700 p-3 lg:block">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full justify-center text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </motion.aside>
    </>
  );
}

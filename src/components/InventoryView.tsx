import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Package, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useProducts } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';

export function InventoryView() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  
  const { products, isLoading } = useProducts();

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search);
    
    if (filter === 'low') return matchesSearch && p.stock <= p.min_stock && p.stock > 0;
    if (filter === 'out') return matchesSearch && p.stock === 0;
    return matchesSearch;
  });

  // Cálculos para paginação
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset página quando filtro muda
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilter: 'all' | 'low' | 'out') => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  // Reset página quando itens por página muda
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const stats = {
    total: products.length,
    low: products.filter((p) => p.stock <= p.min_stock && p.stock > 0).length,
    out: products.filter((p) => p.stock === 0).length,
    healthy: products.filter((p) => p.stock > p.min_stock).length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border bg-card p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total de Produtos</span>
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="mt-2 text-3xl font-bold">{stats.total}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border bg-success/10 border-success/20 p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-success">Estoque Saudável</span>
            <TrendingUp className="h-5 w-5 text-success" />
          </div>
          <p className="mt-2 text-3xl font-bold text-success">{stats.healthy}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border bg-warning/10 border-warning/20 p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-warning-foreground">Estoque Baixo</span>
            <TrendingDown className="h-5 w-5 text-warning" />
          </div>
          <p className="mt-2 text-3xl font-bold text-warning-foreground">{stats.low}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border bg-destructive/10 border-destructive/20 p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-destructive">Sem Estoque</span>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <p className="mt-2 text-3xl font-bold text-destructive">{stats.out}</p>
        </motion.div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar produto..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="8">8 por página</SelectItem>
              <SelectItem value="12">12 por página</SelectItem>
              <SelectItem value="24">24 por página</SelectItem>
              <SelectItem value="48">48 por página</SelectItem>
              <SelectItem value="96">96 por página</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('all')}
          >
            Todos
          </Button>
          <Button
            variant={filter === 'low' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('low')}
          >
            Estoque Baixo
          </Button>
          <Button
            variant={filter === 'out' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('out')}
          >
            Sem Estoque
          </Button>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <AnimatePresence>
          {currentProducts.map((product) => {
            const stockPercentage = Math.min((product.stock / (product.min_stock * 3)) * 100, 100);
            const isLow = product.stock <= product.min_stock && product.stock > 0;
            const isOut = product.stock === 0;

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  'rounded-xl border bg-card p-4 transition-all hover:shadow-soft',
                  isOut && 'border-destructive/50 bg-destructive/5',
                  isLow && 'border-warning/50 bg-warning/5'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{product.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{product.barcode}</p>
                  </div>
                  {isOut && <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />}
                  {isLow && <AlertTriangle className="h-5 w-5 text-warning shrink-0" />}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estoque</span>
                    <span className="font-medium">
                      {product.stock} / {product.min_stock * 3} {product.unit}
                    </span>
                  </div>
                  <Progress
                    value={stockPercentage}
                    className={cn(
                      'h-2',
                      isOut && '[&>div]:bg-destructive',
                      isLow && '[&>div]:bg-warning',
                      !isOut && !isLow && '[&>div]:bg-success'
                    )}
                  />
                  <div className="flex justify-between text-sm pt-2">
                    <span className="text-muted-foreground">Mínimo</span>
                    <span className="font-medium">{product.min_stock} {product.unit}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {currentProducts.length === 0 && filteredProducts.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Package className="mb-4 h-12 w-12" />
          <p className="text-lg font-medium">Nenhum produto encontrado</p>
        </Card>
      )}

      {currentProducts.length === 0 && filteredProducts.length > 0 && (
        <Card className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Package className="mb-4 h-12 w-12" />
          <p className="text-lg font-medium">Nenhum produto nesta página</p>
          <p className="text-sm">Tente voltar para a página anterior</p>
        </Card>
      )}

      {/* Informações de paginação e controles */}
      {filteredProducts.length > 0 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1} a {Math.min(endIndex, filteredProducts.length)} de {filteredProducts.length} produtos
          </div>
          
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                
                {/* Páginas */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Mostrar apenas algumas páginas ao redor da atual
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                  
                  // Mostrar reticências
                  if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <PaginationItem key={page}>
                        <span className="flex h-9 w-9 items-center justify-center text-sm">...</span>
                      </PaginationItem>
                    );
                  }
                  
                  return null;
                })}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}
    </div>
  );
}

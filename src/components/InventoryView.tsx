import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Package, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useProducts } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';

export function InventoryView() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const { products, isLoading } = useProducts();

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search);
    
    if (filter === 'low') return matchesSearch && p.stock <= p.min_stock && p.stock > 0;
    if (filter === 'out') return matchesSearch && p.stock === 0;
    return matchesSearch;
  });

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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Todos
          </Button>
          <Button
            variant={filter === 'low' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('low')}
          >
            Estoque Baixo
          </Button>
          <Button
            variant={filter === 'out' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('out')}
          >
            Sem Estoque
          </Button>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <AnimatePresence>
          {filteredProducts.map((product) => {
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

      {filteredProducts.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Package className="mb-4 h-12 w-12" />
          <p className="text-lg font-medium">Nenhum produto encontrado</p>
        </Card>
      )}
    </div>
  );
}

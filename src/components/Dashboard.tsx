import { motion } from 'framer-motion';
import { DollarSign, ShoppingCart, Package, TrendingUp } from 'lucide-react';
import { StatCard } from './StatCard';
import { Card } from '@/components/ui/card';
import { useStore } from '@/store/useStore';

export function Dashboard() {
  const { products, sales } = useStore();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaySales = sales.filter((s) => new Date(s.createdAt) >= today);
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
  const lowStockProducts = products.filter((p) => p.stock <= p.minStock);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border"
      >
        <h1 className="text-3xl font-bold">Bom dia! 👋</h1>
        <p className="mt-1 text-muted-foreground">
          Bem-vindo ao Mercadinho Mix. Aqui está o resumo do seu negócio.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Vendas Hoje"
          value={todaySales.length}
          icon={ShoppingCart}
          variant="primary"
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Receita Hoje"
          value={`R$ ${todayRevenue.toFixed(2)}`}
          icon={DollarSign}
          variant="accent"
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Produtos Cadastrados"
          value={products.length}
          icon={Package}
          variant="default"
        />
        <StatCard
          title="Estoque Baixo"
          value={lowStockProducts.length}
          icon={TrendingUp}
          variant="warning"
        />
      </div>

      {/* Quick Actions & Recent Sales */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Últimas Vendas</h2>
          {todaySales.length > 0 ? (
            <div className="space-y-3">
              {todaySales.slice(0, 5).map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between rounded-lg border bg-secondary/30 p-3"
                >
                  <div>
                    <p className="font-medium">{sale.items.length} itens</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(sale.createdAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">R$ {sale.total.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground uppercase">
                      {sale.paymentMethod}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <p>Nenhuma venda hoje ainda</p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Produtos com Estoque Baixo</h2>
          {lowStockProducts.length > 0 ? (
            <div className="space-y-3">
              {lowStockProducts.slice(0, 5).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning/5 p-3"
                >
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-warning-foreground">
                      {product.stock} {product.unit}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Mín: {product.minStock}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <p>Todos os produtos com estoque adequado</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Package,
  Calendar,
  Download,
  FileText
} from 'lucide-react';
import { useSales } from '@/hooks/useSales';
import { useProducts } from '@/hooks/useProducts';
import { StatCard } from './StatCard';

export function Reports() {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const { sales } = useSales();
  const { products } = useProducts();

  // Filtrar vendas por período
  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.created_at);
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    return saleDate >= startDate && saleDate <= endDate;
  });

  // Calcular métricas
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const totalSales = filteredSales.length;
  const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

  // Dados para gráficos
  const dailySales = filteredSales.reduce((acc: any, sale) => {
    const date = new Date(sale.created_at).toLocaleDateString('pt-BR');
    if (!acc[date]) {
      acc[date] = { date, revenue: 0, sales: 0 };
    }
    acc[date].revenue += Number(sale.total);
    acc[date].sales += 1;
    return acc;
  }, {});

  const dailySalesData = Object.values(dailySales).slice(-7); // Últimos 7 dias

  // Produtos mais vendidos
  const productSales = filteredSales.reduce((acc: any, sale) => {
    sale.sale_items?.forEach((item: any) => {
      if (!acc[item.product_id]) {
        acc[item.product_id] = {
          name: item.product?.name || 'Produto',
          quantity: 0,
          revenue: 0
        };
      }
      acc[item.product_id].quantity += item.quantity;
      acc[item.product_id].revenue += Number(item.subtotal);
    });
    return acc;
  }, {});

  const topProducts = Object.values(productSales)
    .sort((a: any, b: any) => b.quantity - a.quantity)
    .slice(0, 5);

  // Métodos de pagamento
  const paymentMethods = filteredSales.reduce((acc: any, sale) => {
    const method = sale.payment_method;
    if (!acc[method]) {
      acc[method] = { name: method, value: 0, count: 0 };
    }
    acc[method].value += Number(sale.total);
    acc[method].count += 1;
    return acc;
  }, {});

  const paymentData = Object.values(paymentMethods);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const exportReport = () => {
    const reportData = {
      periodo: `${dateRange.start} a ${dateRange.end}`,
      resumo: {
        totalVendas: totalSales,
        receitaTotal: totalRevenue,
        ticketMedio: averageTicket
      },
      vendasDiarias: dailySalesData,
      produtosMaisVendidos: topProducts,
      metodosPagamento: paymentData,
      geradoEm: new Date().toISOString()
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-vendas-${dateRange.start}-${dateRange.end}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Período do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <Label htmlFor="start-date">Data Inicial</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="end-date">Data Final</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              />
            </div>
            <Button onClick={exportReport} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Principais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Vendas"
          value={totalSales}
          icon={ShoppingCart}
          variant="primary"
        />
        <StatCard
          title="Receita Total"
          value={`R$ ${totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          variant="accent"
        />
        <StatCard
          title="Ticket Médio"
          value={`R$ ${averageTicket.toFixed(2)}`}
          icon={TrendingUp}
          variant="default"
        />
        <StatCard
          title="Produtos Ativos"
          value={products.length}
          icon={Package}
          variant="warning"
        />
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="payments">Pagamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vendas por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailySalesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      name === 'revenue' ? `R$ ${value.toFixed(2)}` : value,
                      name === 'revenue' ? 'Receita' : 'Vendas'
                    ]}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="revenue" />
                  <Line type="monotone" dataKey="sales" stroke="#82ca9d" name="sales" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Produtos Mais Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Métodos de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`R$ ${value.toFixed(2)}`, 'Valor']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
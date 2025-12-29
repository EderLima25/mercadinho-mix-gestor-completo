import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useSales } from '@/hooks/useSales';
import { 
  ArrowLeft, 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Trash2, 
  ShoppingCart,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';

const OFFLINE_SALES_KEY = 'mercadinho-offline-sales';

interface OfflineSale {
  id: string;
  user_id: string;
  total: number;
  payment_method: string;
  items: {
    product_id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }[];
  created_at: string;
  synced: boolean;
}

export default function OfflineSales() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { syncOfflineSales, isOnline } = useSales();
  const [offlineSales, setOfflineSales] = useState<OfflineSale[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadOfflineSales = () => {
    try {
      const sales = JSON.parse(localStorage.getItem(OFFLINE_SALES_KEY) || '[]');
      setOfflineSales(sales);
    } catch {
      setOfflineSales([]);
    }
  };

  useEffect(() => {
    loadOfflineSales();
  }, []);

  const handleSync = async () => {
    if (!isOnline) {
      toast({
        title: 'Sem conexão',
        description: 'Conecte-se à internet para sincronizar as vendas.',
        variant: 'destructive',
      });
      return;
    }

    setIsSyncing(true);
    try {
      await syncOfflineSales();
      loadOfflineSales();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteSale = (saleId: string) => {
    const updatedSales = offlineSales.filter(sale => sale.id !== saleId);
    localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(updatedSales));
    setOfflineSales(updatedSales);
    toast({
      title: 'Venda removida',
      description: 'A venda offline foi removida com sucesso.',
    });
  };

  const handleClearAll = () => {
    localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify([]));
    setOfflineSales([]);
    toast({
      title: 'Todas as vendas removidas',
      description: 'Todas as vendas offline foram removidas.',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      cash: 'Dinheiro',
      credit: 'Crédito',
      debit: 'Débito',
      pix: 'PIX'
    };
    return methods[method] || method;
  };

  const totalPending = offlineSales.reduce((sum, sale) => sum + sale.total, 0);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Vendas Offline</h1>
              <p className="text-muted-foreground">
                Gerencie vendas pendentes de sincronização
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                <Wifi className="h-3 w-3 mr-1" />
                Online
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Vendas Pendentes</CardDescription>
              <CardTitle className="text-3xl">{offlineSales.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Clock className="h-4 w-4" />
                Aguardando sincronização
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Valor Total</CardDescription>
              <CardTitle className="text-3xl">{formatCurrency(totalPending)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <ShoppingCart className="h-4 w-4" />
                Em vendas offline
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Status</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                {isOnline ? (
                  <>
                    <Cloud className="h-8 w-8 text-green-500" />
                    <span className="text-green-600">Pronto</span>
                  </>
                ) : (
                  <>
                    <CloudOff className="h-8 w-8 text-red-500" />
                    <span className="text-red-600">Offline</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground text-sm">
                {isOnline ? 'Pronto para sincronizar' : 'Aguardando conexão'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={handleSync} 
            disabled={!isOnline || offlineSales.length === 0 || isSyncing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
          </Button>

          {offlineSales.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Todas
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover todas as vendas?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Todas as {offlineSales.length} vendas 
                    offline serão permanentemente removidas e não serão sincronizadas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll}>
                    Remover Todas
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Sales Table */}
        <Card>
          <CardHeader>
            <CardTitle>Vendas Pendentes</CardTitle>
            <CardDescription>
              Lista de vendas realizadas offline aguardando sincronização
            </CardDescription>
          </CardHeader>
          <CardContent>
            {offlineSales.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Cloud className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhuma venda offline</p>
                <p className="text-sm">Todas as vendas estão sincronizadas</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offlineSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-xs">
                        {sale.id.replace('offline_', '').substring(0, 8)}...
                      </TableCell>
                      <TableCell>{formatDate(sale.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {sale.items.length} {sale.items.length === 1 ? 'item' : 'itens'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getPaymentMethodLabel(sale.payment_method)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(sale.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover venda?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta venda de {formatCurrency(sale.total)} será removida 
                                permanentemente e não será sincronizada.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteSale(sale.id)}>
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

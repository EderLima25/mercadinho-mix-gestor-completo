import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';
import { useState, useEffect, useCallback } from 'react';

export interface SaleItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  user_id: string;
  total: number;
  payment_method: string;
  created_at: string;
  sale_items?: {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    product?: { name: string };
  }[];
}

export interface TopProduct {
  product_id: string;
  total_quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    barcode: string;
    stock: number;
    cost_price: number;
    min_stock: number;
    category_id: string | null;
    unit: string;
    created_at: string;
    updated_at: string;
  };
}

const OFFLINE_SALES_KEY = 'mercadinho-offline-sales';
const CACHED_PRODUCTS_KEY = 'mercadinho-cached-products';

export function useSales() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOfflineSales, setPendingOfflineSales] = useState(0);

  // Monitorar status de conexão
  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      console.log('Connection status changed:', online ? 'ONLINE' : 'OFFLINE');
      setIsOnline(online);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Contar vendas offline pendentes
  useEffect(() => {
    const count = getOfflineSales().length;
    setPendingOfflineSales(count);
  }, []);

  // Função para obter vendas offline do localStorage
  const getOfflineSales = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem(OFFLINE_SALES_KEY) || '[]');
    } catch {
      return [];
    }
  }, []);

  // Função para salvar vendas offline
  const saveOfflineSales = useCallback((sales: any[]) => {
    localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(sales));
    setPendingOfflineSales(sales.length);
  }, []);

  // Função para atualizar estoque no cache local
  const updateLocalStock = useCallback((items: SaleItem[]) => {
    try {
      const cachedProducts = JSON.parse(localStorage.getItem(CACHED_PRODUCTS_KEY) || '[]');
      
      items.forEach(item => {
        const productIndex = cachedProducts.findIndex((p: any) => p.id === item.product_id);
        if (productIndex !== -1) {
          cachedProducts[productIndex].stock = Math.max(0, cachedProducts[productIndex].stock - item.quantity);
        }
      });
      
      localStorage.setItem(CACHED_PRODUCTS_KEY, JSON.stringify(cachedProducts));
      console.log('Local stock updated');
    } catch (error) {
      console.error('Error updating local stock:', error);
    }
  }, []);

  // Sincronizar vendas offline quando voltar online
  const syncOfflineSales = useCallback(async () => {
    if (!navigator.onLine || !user) {
      console.log('Cannot sync: offline or no user');
      return;
    }

    const offlineSales = getOfflineSales();
    
    if (offlineSales.length === 0) {
      console.log('No offline sales to sync');
      return;
    }

    console.log(`Syncing ${offlineSales.length} offline sales...`);
    
    const failedSales: any[] = [];
    let syncedCount = 0;
    
    for (const offlineSale of offlineSales) {
      try {
        // Criar venda online
        const { data: sale, error: saleError } = await supabase
          .from('sales')
          .insert({
            user_id: user.id,
            total: offlineSale.total,
            payment_method: offlineSale.payment_method,
          })
          .select()
          .single();
        
        if (saleError) {
          console.error('Error creating sale:', saleError);
          failedSales.push(offlineSale);
          continue;
        }

        // Criar itens da venda
        const saleItems = offlineSale.items.map((item: SaleItem) => ({
          sale_id: sale.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
        }));

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItems);

        if (itemsError) {
          console.error('Error creating sale items:', itemsError);
        }

        // Atualizar estoque online
        for (const item of offlineSale.items) {
          const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .single();
          
          if (product) {
            await supabase
              .from('products')
              .update({ stock: Math.max(0, product.stock - item.quantity) })
              .eq('id', item.product_id);
          }
        }
        
        syncedCount++;
        console.log(`Synced offline sale: ${offlineSale.id}`);
      } catch (error) {
        console.error('Error syncing offline sale:', error);
        failedSales.push(offlineSale);
      }
    }

    // Atualizar localStorage com vendas que falharam
    saveOfflineSales(failedSales);

    if (syncedCount > 0) {
      toast({
        title: 'Vendas sincronizadas!',
        description: `${syncedCount} venda(s) sincronizada(s) com sucesso.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['top-products'] });
    }

    if (failedSales.length > 0) {
      toast({
        title: 'Algumas vendas não sincronizaram',
        description: `${failedSales.length} venda(s) ainda pendente(s).`,
        variant: 'destructive',
      });
    }
  }, [user, getOfflineSales, saveOfflineSales, toast, queryClient]);

  // Sincronizar quando voltar online
  useEffect(() => {
    if (isOnline && user) {
      // Delay para garantir que a conexão esteja estável
      const timeout = setTimeout(() => {
        syncOfflineSales();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isOnline, user, syncOfflineSales]);

  const { data: sales = [], isLoading, error } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*, sale_items(*, product:products(name))')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Sale[];
    },
    enabled: isOnline,
  });

  const { data: topProducts = [] } = useQuery({
    queryKey: ['top-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          product_id,
          quantity,
          product:products(id, name, price, barcode, stock, cost_price, min_stock, category_id, unit, created_at, updated_at)
        `)
        .not('product', 'is', null);
      
      if (error) throw error;

      const productMap = new Map();
      
      data.forEach((item: any) => {
        if (item.product) {
          const productId = item.product_id;
          if (productMap.has(productId)) {
            productMap.get(productId).total_quantity += item.quantity;
          } else {
            productMap.set(productId, {
              product_id: productId,
              total_quantity: item.quantity,
              product: item.product
            });
          }
        }
      });

      return Array.from(productMap.values())
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, 8) as TopProduct[];
    },
    enabled: isOnline,
  });

  const createSale = useMutation({
    mutationFn: async ({ 
      items, 
      total, 
      paymentMethod 
    }: { 
      items: SaleItem[]; 
      total: number; 
      paymentMethod: string;
    }) => {
      // Verificar conexão no momento exato da venda
      const currentlyOnline = navigator.onLine;
      console.log('Creating sale - navigator.onLine:', currentlyOnline);

      // Se estiver OFFLINE, salvar localmente e retornar imediatamente
      if (!currentlyOnline) {
        console.log('OFFLINE: Saving sale locally...');
        
        const offlineSale = {
          id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user_id: user?.id || 'anonymous',
          total,
          payment_method: paymentMethod,
          items,
          created_at: new Date().toISOString(),
          synced: false,
        };

        // Salvar no localStorage
        const existingOfflineSales = getOfflineSales();
        existingOfflineSales.push(offlineSale);
        saveOfflineSales(existingOfflineSales);
        console.log('Sale saved offline:', offlineSale.id);

        // Atualizar estoque local
        updateLocalStock(items);

        // Retornar imediatamente para não travar a UI
        return offlineSale;
      }

      // Se estiver ONLINE, processar normalmente
      if (!user) throw new Error('Usuário não autenticado');

      console.log('ONLINE: Creating sale on server...');
      
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          user_id: user.id,
          total,
          payment_method: paymentMethod,
        })
        .select()
        .single();
      
      if (saleError) throw saleError;

      const saleItems = items.map(item => ({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);
      
      if (itemsError) throw itemsError;

      // Atualizar estoque
      for (const item of items) {
        const { data: product } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.product_id)
          .single();
        
        if (product) {
          await supabase
            .from('products')
            .update({ stock: product.stock - item.quantity })
            .eq('id', item.product_id);
        }
      }

      return sale;
    },
    retry: false,
    onSuccess: (sale) => {
      const wasOffline = sale.id.startsWith('offline_');
      console.log('Sale completed:', sale.id, wasOffline ? '(offline)' : '(online)');
      
      if (wasOffline) {
        toast({ 
          title: 'Venda salva offline!',
          description: 'Será sincronizada quando a conexão for restabelecida.'
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ['sales'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['top-products'] });
        toast({ title: 'Venda finalizada!' });
      }
    },
    onError: (error: Error) => {
      console.error('Error creating sale:', error);
      toast({ 
        title: 'Erro ao finalizar venda', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const todaySales = sales.filter(s => {
    const saleDate = new Date(s.created_at);
    const today = new Date();
    return saleDate.toDateString() === today.toDateString();
  });

  const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.total), 0);

  return {
    sales,
    todaySales,
    todayRevenue,
    topProducts,
    isLoading,
    error,
    createSale,
    syncOfflineSales,
    pendingOfflineSales,
    isOnline,
  };
}

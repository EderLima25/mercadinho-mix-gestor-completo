import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';
import { useOffline } from './useOffline';
import { LocalCache } from '@/utils/localCache';

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

export function useSales() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isOnline, addToOfflineQueue } = useOffline();
  const queryClient = useQueryClient();
  const localCache = LocalCache.getInstance();

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
    enabled: isOnline, // Só executar quando online
  });

  // Buscar produtos mais vendidos
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

      // Agrupar por produto e somar quantidades
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

      // Converter para array e ordenar por quantidade vendida
      return Array.from(productMap.values())
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, 8) as TopProduct[];
    },
    enabled: isOnline, // Só executar quando online
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
      if (!user) throw new Error('Usuário não autenticado');

      console.log('Creating sale - isOnline:', isOnline);

      // Se estiver offline, salvar localmente
      if (!isOnline) {
        console.log('Saving sale offline...');
        
        const offlineSale = {
          id: `offline_${Date.now()}_${Math.random()}`,
          user_id: user.id,
          total,
          payment_method: paymentMethod,
          items,
          created_at: new Date().toISOString(),
        };

        try {
          // Salvar no IndexedDB através do LocalCache
          await localCache.saveOfflineSale(offlineSale);
          console.log('Sale saved to IndexedDB');
          
          // Adicionar à fila de sincronização
          addToOfflineQueue({
            type: 'sale',
            data: offlineSale
          });
          console.log('Sale added to offline queue');

          // Atualizar estoque localmente
          const cachedProducts = await localCache.getProducts();
          const updatedProducts = cachedProducts.map(product => {
            const saleItem = items.find(item => item.product_id === product.id);
            if (saleItem) {
              return {
                ...product,
                stock: Math.max(0, product.stock - saleItem.quantity)
              };
            }
            return product;
          });
          await localCache.saveProducts(updatedProducts);
          console.log('Stock updated locally');

          // Retornar imediatamente para resolver a mutation
          return offlineSale;
        } catch (error) {
          console.error('Error saving offline sale:', error);
          
          // Fallback para localStorage se IndexedDB falhar
          try {
            const existingOfflineSales = JSON.parse(localStorage.getItem('offlineSales') || '[]');
            existingOfflineSales.push(offlineSale);
            localStorage.setItem('offlineSales', JSON.stringify(existingOfflineSales));
            console.log('Sale saved to localStorage as fallback');
            
            addToOfflineQueue({
              type: 'sale',
              data: offlineSale
            });
            
            return offlineSale;
          } catch (fallbackError) {
            console.error('Error with localStorage fallback:', fallbackError);
            throw new Error('Não foi possível salvar a venda offline');
          }
        }
      }

      console.log('Creating sale online...');
      
      // Create sale online
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

      // Create sale items
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

      // Update stock for each product
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
    retry: false, // Não tentar novamente em caso de erro
    onSuccess: (sale) => {
      console.log('Sale created successfully:', sale);
      
      // Só invalidar queries quando online
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: ['sales'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['top-products'] });
      }
      
      if (isOnline) {
        toast({ title: 'Venda finalizada!' });
      } else {
        toast({ 
          title: 'Venda salva offline!',
          description: 'A venda será sincronizada quando a conexão for restabelecida.'
        });
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
  };
}

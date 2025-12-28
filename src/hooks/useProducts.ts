import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LocalCache } from '@/utils/localCache';
import { useOffline } from '@/hooks/useOffline';
import { useEffect } from 'react';

export interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  cost_price: number;
  stock: number;
  min_stock: number;
  category_id: string | null;
  unit: string;
  created_at: string;
  updated_at: string;
  category?: { id: string; name: string; color: string } | null;
}

export interface ProductInsert {
  name: string;
  barcode: string;
  price: number;
  cost_price: number;
  stock: number;
  min_stock: number;
  category_id?: string | null;
  unit: string;
}

export function useProducts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isOnline, addToOfflineQueue } = useOffline();
  const localCache = LocalCache.getInstance();

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      if (isOnline) {
        try {
          const { data, error } = await supabase
            .from('products')
            .select('*, category:categories(*)')
            .order('name');
          
          if (error) throw error;
          
          // Cache products locally
          await localCache.saveProducts(data);
          return data as Product[];
        } catch (error) {
          // If online but request fails, fallback to cache
          console.warn('Failed to fetch from server, using cache:', error);
          return await localCache.getProducts();
        }
      } else {
        // Offline: use cached data
        return await localCache.getProducts();
      }
    },
  });

  // Initialize local cache on mount
  useEffect(() => {
    localCache.init();
  }, []);

  const addProduct = useMutation({
    mutationFn: async (product: ProductInsert) => {
      if (isOnline) {
        const { data, error } = await supabase
          .from('products')
          .insert(product)
          .select('*, category:categories(*)')
          .single();
        
        if (error) throw error;
        return data as Product;
      } else {
        // Offline: queue for later sync
        const tempProduct = {
          ...product,
          id: `temp_${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        addToOfflineQueue({
          type: 'addProduct',
          data: product
        });
        
        return tempProduct as Product;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ 
        title: isOnline ? 'Produto cadastrado com sucesso!' : 'Produto salvo offline - será sincronizado quando conectar'
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao cadastrar produto', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      if (isOnline) {
        const { data, error } = await supabase
          .from('products')
          .update(updates)
          .eq('id', id)
          .select('*, category:categories(*)')
          .single();
        
        if (error) throw error;
        return data as Product;
      } else {
        // Offline: queue for later sync
        addToOfflineQueue({
          type: 'updateProduct',
          data: { id, ...updates }
        });
        
        // Update local cache
        const cachedProducts = await localCache.getProducts();
        const updatedProducts = cachedProducts.map(p => 
          p.id === id ? { ...p, ...updates } : p
        );
        await localCache.saveProducts(updatedProducts);
        
        return { id, ...updates } as Product;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ 
        title: isOnline ? 'Produto atualizado!' : 'Produto atualizado offline - será sincronizado quando conectar'
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao atualizar produto', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      if (isOnline) {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
      } else {
        // Offline: queue for later sync
        addToOfflineQueue({
          type: 'deleteProduct',
          data: { id }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ 
        title: isOnline ? 'Produto removido!' : 'Produto marcado para remoção - será sincronizado quando conectar'
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao remover produto', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateStock = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const product = products.find(p => p.id === id);
      if (!product) throw new Error('Produto não encontrado');
      
      if (isOnline) {
        const { error } = await supabase
          .from('products')
          .update({ stock: product.stock - quantity })
          .eq('id', id);
        
        if (error) throw error;
      } else {
        // Offline: update local cache and queue for sync
        const newStock = product.stock - quantity;
        addToOfflineQueue({
          type: 'updateStock',
          data: { id, stock: newStock }
        });
        
        // Update local cache
        const cachedProducts = await localCache.getProducts();
        const updatedProducts = cachedProducts.map(p => 
          p.id === id ? { ...p, stock: newStock } : p
        );
        await localCache.saveProducts(updatedProducts);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const getProductByBarcode = async (barcode: string): Promise<Product | null> => {
    if (isOnline) {
      return products.find(p => p.barcode === barcode) || null;
    } else {
      // Offline: search in local cache
      return await localCache.getProductByBarcode(barcode);
    }
  };

  const importProducts = useMutation({
    mutationFn: async (productsToImport: ProductInsert[]) => {
      if (isOnline) {
        const { error } = await supabase
          .from('products')
          .upsert(productsToImport, { onConflict: 'barcode' });
        
        if (error) throw error;
      } else {
        // Offline: queue for later sync
        addToOfflineQueue({
          type: 'importProducts',
          data: productsToImport
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ 
        title: isOnline ? 'Produtos importados com sucesso!' : 'Produtos salvos offline - serão sincronizados quando conectar'
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao importar produtos', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  return {
    products,
    isLoading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    getProductByBarcode,
    importProducts,
    isOnline,
  };
}

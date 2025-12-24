import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .order('name');
      
      if (error) throw error;
      return data as Product[];
    },
  });

  const addProduct = useMutation({
    mutationFn: async (product: ProductInsert) => {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select('*, category:categories(*)')
        .single();
      
      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Produto cadastrado com sucesso!' });
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
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select('*, category:categories(*)')
        .single();
      
      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Produto atualizado!' });
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
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Produto removido!' });
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
      
      const { error } = await supabase
        .from('products')
        .update({ stock: product.stock - quantity })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const getProductByBarcode = (barcode: string) => {
    return products.find(p => p.barcode === barcode);
  };

  const importProducts = useMutation({
    mutationFn: async (productsToImport: ProductInsert[]) => {
      const { error } = await supabase
        .from('products')
        .upsert(productsToImport, { onConflict: 'barcode' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Produtos importados com sucesso!' });
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
  };
}

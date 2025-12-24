import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Category {
  id: string;
  name: string;
  color: string;
  parent_id: string | null;
  created_at: string;
  children?: Category[];
  parent?: Category | null;
  product_count?: number;
}

export function useCategories() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          parent:categories!parent_id(id, name, color),
          children:categories!parent_id(id, name, color),
          products(count)
        `)
        .order('name');
      
      if (error) throw error;
      
      // Process data to include product count and build hierarchy
      const processedData = data.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        color: cat.color,
        parent_id: cat.parent_id,
        created_at: cat.created_at,
        product_count: cat.products?.[0]?.count || 0,
        children: cat.children || [],
        parent: cat.parent || null
      }));
      
      return processedData as Category[];
    },
  });

  const addCategory = useMutation({
    mutationFn: async (category: { name: string; color: string; parent_id?: string | null }) => {
      const { data, error } = await supabase
        .from('categories')
        .insert(category)
        .select()
        .single();
      
      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Categoria criada!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao criar categoria', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Category> & { id: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Categoria atualizada!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao atualizar categoria', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Categoria removida!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao remover categoria', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Build hierarchical tree structure
  const buildCategoryTree = (categories: Category[]): Category[] => {
    const categoryMap = new Map<string, Category>();
    const rootCategories: Category[] = [];

    // First pass: create map and initialize children arrays
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] });
    });

    // Second pass: build hierarchy
    categories.forEach(category => {
      const categoryWithChildren = categoryMap.get(category.id)!;
      
      if (category.parent_id) {
        const parent = categoryMap.get(category.parent_id);
        if (parent) {
          parent.children!.push(categoryWithChildren);
        }
      } else {
        rootCategories.push(categoryWithChildren);
      }
    });

    return rootCategories;
  };

  const getCategoryPath = (categoryId: string): Category[] => {
    const path: Category[] = [];
    let currentCategory = categories.find(c => c.id === categoryId);
    
    while (currentCategory) {
      path.unshift(currentCategory);
      currentCategory = currentCategory.parent_id 
        ? categories.find(c => c.id === currentCategory!.parent_id) 
        : undefined;
    }
    
    return path;
  };

  return {
    categories,
    isLoading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
    buildCategoryTree,
    getCategoryPath,
  };
}

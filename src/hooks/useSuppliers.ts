import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Supplier {
  id: string;
  name: string;
  cnpj_cpf: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  contact_person: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierInsert {
  name: string;
  cnpj_cpf: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  contact_person?: string | null;
  is_active?: boolean;
}

export function useSuppliers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading, error } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('suppliers' as any)
          .select('*')
          .order('name');
        
        if (error) {
          console.warn('Erro ao buscar fornecedores:', error);
          return [];
        }
        return data as any;
      } catch (error) {
        console.warn('Tabela suppliers não encontrada ou erro de permissão');
        return [];
      }
    },
    retry: false,
  });

  const addSupplier = useMutation({
    mutationFn: async (supplier: SupplierInsert) => {
      const { data, error } = await supabase
        .from('suppliers' as any)
        .insert(supplier)
        .select()
        .single();
      
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: 'Fornecedor cadastrado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao cadastrar fornecedor', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateSupplier = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Supplier> & { id: string }) => {
      const { data, error } = await supabase
        .from('suppliers' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: 'Fornecedor atualizado!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao atualizar fornecedor', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('suppliers' as any)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: 'Fornecedor removido!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao remover fornecedor', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const toggleSupplierStatus = useMutation({
    mutationFn: async (id: string) => {
      const supplier = suppliers.find(s => s.id === id);
      if (!supplier) throw new Error('Fornecedor não encontrado');
      
      const { error } = await supabase
        .from('suppliers' as any)
        .update({ is_active: !supplier.is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: 'Status do fornecedor atualizado!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao atualizar status', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const validateCNPJCPF = (value: string): boolean => {
    const cleanValue = value.replace(/\D/g, '');
    
    if (cleanValue.length === 11) {
      // Validação básica de CPF
      return /^\d{11}$/.test(cleanValue);
    } else if (cleanValue.length === 14) {
      // Validação básica de CNPJ
      return /^\d{14}$/.test(cleanValue);
    }
    
    return false;
  };

  const formatCNPJCPF = (value: string): string => {
    const cleanValue = value.replace(/\D/g, '');
    
    if (cleanValue.length <= 11) {
      // Formato CPF: 000.000.000-00
      return cleanValue
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      // Formato CNPJ: 00.000.000/0000-00
      return cleanValue
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
  };

  return {
    suppliers,
    isLoading,
    error,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    toggleSupplierStatus,
    validateCNPJCPF,
    formatCNPJCPF,
  };
}
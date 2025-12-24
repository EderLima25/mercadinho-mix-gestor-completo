import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CashRegister {
  id: string;
  user_id: string;
  opened_at: string;
  closed_at: string | null;
  initial_amount: number;
  final_amount: number | null;
  total_sales: number;
  total_cash_sales: number;
  total_card_sales: number;
  total_pix_sales: number;
  withdrawals: number;
  deposits: number;
  is_open: boolean;
  notes: string | null;
}

export interface CashMovement {
  id: string;
  cash_register_id: string;
  type: 'withdrawal' | 'deposit' | 'sale';
  amount: number;
  description: string;
  created_at: string;
  user_id: string;
}

export interface CashRegisterInsert {
  initial_amount: number;
  notes?: string | null;
}

export interface CashMovementInsert {
  cash_register_id: string;
  type: 'withdrawal' | 'deposit';
  amount: number;
  description: string;
}

export function useCashRegister() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current open cash register - versão simplificada
  const { data: currentRegister, isLoading: isLoadingCurrent } = useQuery({
    queryKey: ['current-cash-register'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('cash_registers' as any)
          .select('*')
          .eq('is_open', true)
          .order('opened_at', { ascending: false })
          .limit(1)
          .maybeSingle(); // Use maybeSingle instead of single
        
        if (error) {
          console.warn('Erro ao buscar caixa atual:', error);
          return null;
        }
        return data as any;
      } catch (error) {
        console.warn('Tabela cash_registers não encontrada ou erro de permissão');
        return null;
      }
    },
    retry: false, // Não tentar novamente em caso de erro
  });

  // Get cash register history - versão simplificada
  const { data: registers = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['cash-registers'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('cash_registers' as any)
          .select('*')
          .order('opened_at', { ascending: false })
          .limit(50);
        
        if (error) {
          console.warn('Erro ao buscar histórico de caixas:', error);
          return [];
        }
        return data as any;
      } catch (error) {
        console.warn('Tabela cash_registers não encontrada ou erro de permissão');
        return [];
      }
    },
    retry: false,
  });

  // Get cash movements for current register - versão simplificada
  const { data: movements = [], isLoading: isLoadingMovements } = useQuery({
    queryKey: ['cash-movements', currentRegister?.id],
    queryFn: async () => {
      if (!currentRegister?.id) return [];
      
      try {
        const { data, error } = await supabase
          .from('cash_movements' as any)
          .select('*')
          .eq('cash_register_id', currentRegister.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.warn('Erro ao buscar movimentações:', error);
          return [];
        }
        return data as any;
      } catch (error) {
        console.warn('Tabela cash_movements não encontrada ou erro de permissão');
        return [];
      }
    },
    enabled: !!currentRegister?.id,
    retry: false,
  });

  const openCashRegister = useMutation({
    mutationFn: async (data: CashRegisterInsert) => {
      // Check if there's already an open register
      const { data: existingOpen } = await supabase
        .from('cash_registers')
        .select('id')
        .eq('is_open', true)
        .limit(1);

      if (existingOpen && existingOpen.length > 0) {
        throw new Error('Já existe um caixa aberto. Feche o caixa atual antes de abrir um novo.');
      }

      const { data: result, error } = await supabase
        .from('cash_registers' as any)
        .insert({
          initial_amount: data.initial_amount,
          notes: data.notes,
          is_open: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-cash-register'] });
      queryClient.invalidateQueries({ queryKey: ['cash-registers'] });
      toast({ title: 'Caixa aberto com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao abrir caixa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const closeCashRegister = useMutation({
    mutationFn: async ({ finalAmount, notes }: { finalAmount: number; notes?: string }) => {
      if (!currentRegister) {
        throw new Error('Nenhum caixa aberto encontrado');
      }

      const { error } = await supabase
        .from('cash_registers' as any)
        .update({
          final_amount: finalAmount,
          closed_at: new Date().toISOString(),
          is_open: false,
          notes: notes || currentRegister.notes,
        })
        .eq('id', currentRegister.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-cash-register'] });
      queryClient.invalidateQueries({ queryKey: ['cash-registers'] });
      queryClient.invalidateQueries({ queryKey: ['cash-movements'] });
      toast({ title: 'Caixa fechado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao fechar caixa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const addCashMovement = useMutation({
    mutationFn: async (movement: CashMovementInsert) => {
      const { data, error } = await supabase
        .from('cash_movements' as any)
        .insert(movement)
        .select()
        .single();
      
      if (error) throw error;

      // Update cash register totals
      const updateField = movement.type === 'withdrawal' ? 'withdrawals' : 'deposits';
      const currentValue = currentRegister?.[updateField] || 0;
      
      await supabase
        .from('cash_registers' as any)
        .update({
          [updateField]: currentValue + movement.amount
        })
        .eq('id', movement.cash_register_id);

      return data as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-cash-register'] });
      queryClient.invalidateQueries({ queryKey: ['cash-movements'] });
      toast({ 
        title: 'Movimentação registrada!',
        description: 'O valor foi adicionado ao caixa.'
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao registrar movimentação', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Calculate expected cash amount
  const getExpectedCashAmount = () => {
    if (!currentRegister) return 0;
    
    return (
      currentRegister.initial_amount +
      currentRegister.total_cash_sales +
      currentRegister.deposits -
      currentRegister.withdrawals
    );
  };

  // Calculate difference between expected and actual
  const getCashDifference = (actualAmount: number) => {
    return actualAmount - getExpectedCashAmount();
  };

  return {
    currentRegister,
    registers,
    movements,
    isLoadingCurrent,
    isLoadingHistory,
    isLoadingMovements,
    openCashRegister,
    closeCashRegister,
    addCashMovement,
    getExpectedCashAmount,
    getCashDifference,
  };
}
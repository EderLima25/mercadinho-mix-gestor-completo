import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCompanyId } from '@/utils/tenant';
import { useToast } from '@/hooks/use-toast';
import { BILLING } from '@/config/billing';

export interface Subscription {
  id: string;
  company_id: string;
  plan: string;
  status: string;
  amount: number;
  trial_ends_at: string;
  current_period_end: string | null;
}

export interface SubscriptionPayment {
  id: string;
  amount: number;
  months: number;
  reference: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!navigator.onLine) {
      setLoading(false);
      return;
    }
    try {
      const companyId = await getCompanyId();

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      setSubscription((sub as Subscription) ?? null);

      const { data: pays } = await supabase
        .from('subscription_payments')
        .select('id, amount, months, reference, notes, status, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      setPayments((pays as SubscriptionPayment[]) ?? []);
    } catch {
      // offline ou empresa ainda não provisionada
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const declarePayment = async (months: number, reference: string, notes: string) => {
    try {
      const companyId = await getCompanyId();
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

      const { error } = await supabase.from('subscription_payments').insert({
        company_id: companyId,
        user_id: userId,
        amount: Number((BILLING.monthlyPrice * months).toFixed(2)),
        months,
        method: 'pix',
        reference: reference || null,
        notes: notes || null,
      });
      if (error) throw error;

      toast({
        title: 'Comprovante enviado',
        description: 'Seu pagamento será confirmado em até 1 dia útil.',
      });
      await load();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar comprovante',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const daysLeft = (() => {
    if (!subscription) return null;
    const end =
      subscription.status === 'trial'
        ? subscription.trial_ends_at
        : subscription.current_period_end;
    if (!end) return null;
    return Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
  })();

  const isActive =
    !subscription ||
    (subscription.status === 'trial' && (daysLeft ?? 0) > 0) ||
    (subscription.status === 'active' && (daysLeft ?? 1) > 0);

  return { subscription, payments, loading, declarePayment, reload: load, daysLeft, isActive };
}

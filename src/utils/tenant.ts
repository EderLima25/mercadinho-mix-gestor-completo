import { supabase } from '@/integrations/supabase/client';

const CACHE_KEY = 'mercadopdv-company-id';

let cached: string | null = null;

export function getCachedCompanyId(): string | null {
  if (cached) return cached;
  cached = localStorage.getItem(CACHE_KEY);
  return cached;
}

export function setCachedCompanyId(id: string | null) {
  cached = id;
  if (id) localStorage.setItem(CACHE_KEY, id);
  else localStorage.removeItem(CACHE_KEY);
}

/**
 * Returns the company (tenant) id of the signed-in user.
 * Falls back to the locally cached value when offline.
 */
export async function getCompanyId(): Promise<string> {
  if (!navigator.onLine) {
    const local = getCachedCompanyId();
    if (local) return local;
    throw new Error('Empresa não identificada (offline)');
  }

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) {
    const local = getCachedCompanyId();
    if (local) return local;
    throw new Error('Usuário não autenticado');
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.company_id) throw new Error('Empresa não encontrada para este usuário');

  setCachedCompanyId(data.company_id);
  return data.company_id;
}

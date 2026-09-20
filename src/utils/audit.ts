import { supabase } from '@/integrations/supabase/client';

/** Registra um evento no histórico de auditoria da empresa. Nunca lança erro. */
export async function logAudit(
  action: string,
  opts: {
    entity?: string;
    entityId?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  } = {},
): Promise<void> {
  try {
    if (!navigator.onLine) return;
    await supabase.rpc('log_audit' as never, {
      _action: action,
      _entity: opts.entity ?? null,
      _entity_id: opts.entityId ?? null,
      _description: opts.description ?? null,
      _metadata: opts.metadata ?? {},
    } as never);
  } catch {
    // auditoria nunca deve quebrar a operação do usuário
  }
}

/** Segundos restantes de bloqueio por excesso de tentativas de login. */
export async function loginBlockSeconds(email: string): Promise<number> {
  try {
    const { data } = await supabase.rpc('login_block_seconds' as never, { _email: email } as never);
    return Number(data ?? 0) || 0;
  } catch {
    return 0;
  }
}

/** Registra uma tentativa de login (com ou sem sucesso). */
export async function recordLoginAttempt(email: string, success: boolean): Promise<void> {
  try {
    await supabase.rpc('record_login_attempt' as never, { _email: email, _success: success } as never);
  } catch {
    // ignora
  }
}

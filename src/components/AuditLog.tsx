import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollText, RefreshCw, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';

interface AuditRow {
  id: string;
  created_at: string;
  user_email: string | null;
  action: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
}

const ACTION_LABEL: Record<string, string> = {
  'auth.login': 'Entrou no sistema',
  'auth.logout': 'Saiu do sistema',
  'auth.login_failed': 'Falha ao entrar',
  'auth.mfa_enabled': 'Ativou verificação em 2 etapas',
  'auth.mfa_disabled': 'Desativou verificação em 2 etapas',
  'product.price_changed': 'Alterou preço',
  'product.deleted': 'Excluiu produto',
  'sale.created': 'Registrou venda',
  'user_role.granted': 'Concedeu cargo',
  'user_role.changed': 'Alterou cargo',
  'user_role.removed': 'Removeu cargo',
  'invite.created': 'Criou convite',
  'invite.accepted': 'Convite aceito',
  'subscription_payment.declared': 'Informou pagamento',
};

function labelFor(action: string) {
  return ACTION_LABEL[action] ?? action;
}

export function AuditLog() {
  const { isAdmin } = usePermissions();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('audit_logs' as never)
      .select('id, created_at, user_email, action, description, metadata')
      .order('created_at', { ascending: false })
      .limit(300);
    setRows((data as unknown as AuditRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-6 text-muted-foreground">
          <ShieldAlert className="h-5 w-5" />
          Apenas o administrador da empresa pode ver o histórico de auditoria.
        </CardContent>
      </Card>
    );
  }

  const visible = rows.filter((r) => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return (
      (r.user_email ?? '').toLowerCase().includes(q) ||
      labelFor(r.action).toLowerCase().includes(q) ||
      (r.description ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="h-5 w-5" />
          Auditoria
        </CardTitle>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar por pessoa ou ação"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-56"
          />
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            {loading ? 'Carregando...' : 'Nenhum registro ainda.'}
          </p>
        ) : (
          <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {visible.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-4 rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={r.action.startsWith('auth.login_failed') ? 'destructive' : 'secondary'}>
                      {labelFor(r.action)}
                    </Badge>
                    <span className="text-sm font-medium">{r.user_email ?? 'Sistema'}</span>
                  </div>
                  {r.description && (
                    <p className="mt-1 truncate text-sm text-muted-foreground">{r.description}</p>
                  )}
                  {r.metadata && Object.keys(r.metadata).length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {Object.entries(r.metadata)
                        .map(([k, v]) => `${k}: ${String(v)}`)
                        .join(' · ')}
                    </p>
                  )}
                </div>
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

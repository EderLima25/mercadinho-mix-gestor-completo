import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldOff, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { logAudit } from '@/utils/audit';

interface Factor {
  id: string;
  status: string;
  friendly_name?: string;
}

export function TwoFactorSettings() {
  const { isAdmin } = usePermissions();
  const { toast } = useToast();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as Factor[]);
  };

  useEffect(() => { load(); }, []);

  const verified = factors.filter((f) => f.status === 'verified');

  const startEnroll = async () => {
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `MercadoPDV ${Date.now()}`,
    });
    setBusy(false);
    if (error) {
      toast({ title: 'Não foi possível iniciar', description: error.message, variant: 'destructive' });
      return;
    }
    setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const confirmEnroll = async () => {
    if (!enrolling) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrolling.id,
      code: code.trim(),
    });
    setBusy(false);
    if (error) {
      toast({ title: 'Código inválido', description: 'Confira o código do aplicativo e tente novamente.', variant: 'destructive' });
      return;
    }
    setEnrolling(null);
    setCode('');
    await load();
    await logAudit('auth.mfa_enabled', { description: 'Ativou verificação em 2 etapas' });
    toast({ title: 'Verificação em 2 etapas ativada!' });
  };

  const removeFactor = async (id: string) => {
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    setBusy(false);
    if (error) {
      toast({ title: 'Não foi possível desativar', description: error.message, variant: 'destructive' });
      return;
    }
    await load();
    await logAudit('auth.mfa_disabled', { description: 'Desativou verificação em 2 etapas' });
    toast({ title: 'Verificação em 2 etapas desativada' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Verificação em 2 etapas
          {verified.length > 0 && <Badge className="ml-2">Ativa</Badge>}
        </CardTitle>
        <CardDescription>
          {isAdmin
            ? 'Recomendado para administradores: além da senha, o sistema pede um código do aplicativo autenticador (Google Authenticator, Authy, etc.).'
            : 'Proteja sua conta pedindo um código do aplicativo autenticador além da senha.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {verified.length > 0 && !enrolling && (
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm">Aplicativo autenticador cadastrado.</span>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => removeFactor(verified[0].id)}>
              <ShieldOff className="mr-2 h-4 w-4" /> Desativar
            </Button>
          </div>
        )}

        {verified.length === 0 && !enrolling && (
          <Button onClick={startEnroll} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Ativar verificação em 2 etapas
          </Button>
        )}

        {enrolling && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              1. Abra seu aplicativo autenticador e leia o código abaixo.
            </p>
            <img src={enrolling.qr} alt="QR Code para o aplicativo autenticador" className="h-48 w-48 rounded-lg border bg-white p-2" />
            <p className="text-xs text-muted-foreground">
              Se não conseguir ler, digite esta chave no aplicativo: <span className="font-mono">{enrolling.secret}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="mfa-code">2. Digite o código de 6 dígitos</Label>
              <Input
                id="mfa-code"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-40 tracking-widest"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={confirmEnroll} disabled={busy || code.length !== 6}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar
              </Button>
              <Button variant="ghost" onClick={() => { setEnrolling(null); setCode(''); }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

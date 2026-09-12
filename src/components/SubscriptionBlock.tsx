import { Button } from '@/components/ui/button';
import { AlertTriangle, LogOut } from 'lucide-react';
import { AccountBilling } from '@/components/AccountBilling';
import { useAuth } from '@/hooks/useAuth';
import { BILLING } from '@/config/billing';

export function SubscriptionBlock() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl p-6 space-y-6">
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-6 w-6 text-destructive" />
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Assinatura vencida</h1>
              <p className="text-sm text-muted-foreground">
                O acesso ao sistema está bloqueado até a confirmação do pagamento. Faça o PIX
                abaixo e envie o comprovante — a liberação acontece em até 1 dia útil. Seus dados
                continuam guardados e nada foi apagado.
              </p>
              <p className="text-sm text-muted-foreground">
                Dúvidas: <a className="underline" href={`mailto:${BILLING.supportEmail}`}>{BILLING.supportEmail}</a>
              </p>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        <AccountBilling />
      </div>
    </div>
  );
}

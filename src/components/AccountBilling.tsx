import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Copy, CreditCard, Download, ShieldCheck, Trash2, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BILLING, formatBRL } from '@/config/billing';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getCompanyId } from '@/utils/tenant';

const statusLabel: Record<string, string> = {
  trial: 'Período de teste',
  active: 'Ativa',
  pending: 'Aguardando confirmação',
  expired: 'Expirada',
  canceled: 'Cancelada',
};

export function AccountBilling() {
  const { subscription, payments, loading, declarePayment, daysLeft } = useSubscription();
  const { companyName, signOut } = useAuth();
  const { toast } = useToast();
  const [months, setMonths] = useState('1');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const total = BILLING.monthlyPrice * Number(months || 1);

  const copyPix = async () => {
    await navigator.clipboard?.writeText(BILLING.pixKey);
    toast({ title: 'Chave PIX copiada' });
  };

  const submitPayment = async () => {
    setSending(true);
    const ok = await declarePayment(Number(months), reference, notes);
    if (ok) {
      setReference('');
      setNotes('');
    }
    setSending(false);
  };

  const exportData = async () => {
    setExporting(true);
    try {
      const companyId = await getCompanyId();
      const tables = [
        'companies',
        'profiles',
        'products',
        'categories',
        'suppliers',
        'sales',
        'sale_items',
        'cash_registers',
        'cash_movements',
      ] as const;

      const dump: Record<string, unknown> = {
        exportado_em: new Date().toISOString(),
        empresa: companyName,
      };

      for (const table of tables) {
        const column = table === 'companies' ? 'id' : table === 'profiles' ? 'company_id' : 'company_id';
        const { data } = await supabase.from(table).select('*').eq(column, companyId);
        dump[table] = data ?? [];
      }

      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mercadopdv-dados-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Dados exportados', description: 'O arquivo foi baixado no seu dispositivo.' });
    } catch (error: any) {
      toast({ title: 'Erro ao exportar', description: error.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;
      toast({
        title: 'Conta excluída',
        description: (data as any)?.deletedCompany
          ? 'A empresa e todos os dados foram removidos.'
          : 'Seu acesso foi removido desta empresa.',
      });
      await signOut();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir conta', description: error.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Assinatura */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Assinatura
          </CardTitle>
          <CardDescription>
            {BILLING.planName} — {formatBRL(BILLING.monthlyPrice)} por mês, pago via PIX.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : subscription ? (
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-primary/10 text-primary">
                {statusLabel[subscription.status] ?? subscription.status}
              </Badge>
              {daysLeft !== null && (
                <span className="text-sm text-muted-foreground">
                  {daysLeft > 0
                    ? `${daysLeft} dia(s) restante(s)`
                    : 'Vencida — envie o pagamento para reativar'}
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Assinatura não encontrada.</p>
          )}
        </CardContent>
      </Card>

      {/* Pagamento PIX */}
      <Card>
        <CardHeader>
          <CardTitle>Pagar via PIX</CardTitle>
          <CardDescription>
            Faça o PIX para a chave abaixo e informe o comprovante. A confirmação é feita
            manualmente em até 1 dia útil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
            <p className="text-xs text-muted-foreground">Chave PIX</p>
            <div className="flex items-center gap-2">
              <code className="text-sm font-medium break-all">{BILLING.pixKey}</code>
              <Button variant="outline" size="sm" onClick={copyPix}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Favorecido: {BILLING.pixHolder}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={months} onValueChange={setMonths}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 mês</SelectItem>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">12 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ref">Identificador do PIX</Label>
              <Input
                id="ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex.: E1234567890..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Data e horário do pagamento, nome do pagador..."
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total: {formatBRL(total)}</span>
            <Button onClick={submitPayment} disabled={sending}>
              Enviar comprovante
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Histórico */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pagamentos enviados</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {new Date(payment.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>{payment.months} mês(es)</TableCell>
                    <TableCell>{formatBRL(Number(payment.amount))}</TableCell>
                    <TableCell>
                      <Badge variant={payment.status === 'approved' ? 'default' : 'outline'}>
                        {payment.status === 'approved'
                          ? 'Aprovado'
                          : payment.status === 'rejected'
                            ? 'Recusado'
                            : 'Pendente'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* LGPD */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Privacidade e dados (LGPD)
          </CardTitle>
          <CardDescription>
            Exporte ou exclua os dados da sua empresa a qualquer momento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={exportData} disabled={exporting}>
              <Download className="mr-2 h-4 w-4" />
              {exporting ? 'Exportando...' : 'Exportar meus dados'}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/termos">
                <FileText className="mr-2 h-4 w-4" />
                Termos de Uso
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/privacidade">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Política de Privacidade
              </Link>
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium text-destructive">Excluir conta</p>
            <p className="text-sm text-muted-foreground">
              Se você for o único administrador, a empresa e todos os dados (produtos, vendas,
              caixa e usuários) serão apagados permanentemente.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir minha conta
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir conta permanentemente?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Recomendamos exportar seus dados antes.
                    Digite EXCLUIR para confirmar.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="EXCLUIR"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={confirmText !== 'EXCLUIR' || deleting}
                    onClick={deleteAccount}
                  >
                    {deleting ? 'Excluindo...' : 'Excluir tudo'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

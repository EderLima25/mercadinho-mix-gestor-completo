import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Copy, Mail, Send, Ban } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getCompanyId } from '@/utils/tenant';
import { useToast } from '@/hooks/use-toast';

type Role = 'admin' | 'manager' | 'cashier';

interface Invite {
  id: string;
  email: string;
  role: Role;
  token: string;
  status: string;
  expires_at: string;
  created_at: string;
}

const roleLabel: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  cashier: 'Operador',
};

export function InviteManager() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('cashier');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase
      .from('company_invites')
      .select('id, email, role, token, status, expires_at, created_at')
      .order('created_at', { ascending: false });
    setInvites((data as Invite[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const inviteLink = (token: string) =>
    `${window.location.origin}/auth?convite=${token}`;

  const createInvite = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast({ title: 'Email inválido', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const companyId = await getCompanyId();
      const { data: auth } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('company_invites')
        .insert({
          company_id: companyId,
          email: email.trim().toLowerCase(),
          role: role as any,
          invited_by: auth?.user?.id ?? null,
        })
        .select('token')
        .single();

      if (error) throw error;

      await navigator.clipboard?.writeText(inviteLink(data.token)).catch(() => {});
      setEmail('');
      await load();
      toast({
        title: 'Convite criado',
        description: 'O link foi copiado. Envie para o funcionário.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao criar convite',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const revoke = async (id: string) => {
    const { error } = await supabase
      .from('company_invites')
      .update({ status: 'revoked' })
      .eq('id', id);
    if (error) {
      toast({ title: 'Erro ao cancelar', description: error.message, variant: 'destructive' });
      return;
    }
    await load();
    toast({ title: 'Convite cancelado' });
  };

  const copy = async (token: string) => {
    await navigator.clipboard?.writeText(inviteLink(token));
    toast({ title: 'Link copiado' });
  };

  const statusBadge = (invite: Invite) => {
    if (invite.status === 'accepted') return <Badge className="bg-green-100 text-green-800">Aceito</Badge>;
    if (invite.status === 'revoked') return <Badge variant="outline">Cancelado</Badge>;
    if (new Date(invite.expires_at) < new Date())
      return <Badge className="bg-yellow-100 text-yellow-800">Expirado</Badge>;
    return <Badge className="bg-blue-100 text-blue-800">Pendente</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Convidar funcionário
        </CardTitle>
        <CardDescription>
          Gere um link de convite para o funcionário entrar nesta empresa com o cargo escolhido.
          Sem convite, quem se cadastra cria uma empresa nova.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-[1fr,180px,auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email do funcionário</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="funcionario@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Cargo</Label>
            <Select value={role} onValueChange={(v: Role) => setRole(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cashier">Operador</SelectItem>
                <SelectItem value="manager">Gerente</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={createInvite} disabled={sending}>
            <Send className="mr-2 h-4 w-4" />
            Gerar convite
          </Button>
        </div>

        {invites.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Válido até</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell className="font-medium">{invite.email}</TableCell>
                  <TableCell>{roleLabel[invite.role] ?? invite.role}</TableCell>
                  <TableCell>{statusBadge(invite)}</TableCell>
                  <TableCell>
                    {new Date(invite.expires_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {invite.status === 'pending' && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => copy(invite.token)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => revoke(invite.id)}>
                          <Ban className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

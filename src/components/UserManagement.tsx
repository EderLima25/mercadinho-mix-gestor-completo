import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Edit, 
  Trash2,
  Crown,
  User,
  ShoppingCart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  roles: string[];
}

interface ProfileData {
  id: string;
  full_name: string | null;
  created_at: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRole, setNewRole] = useState<'admin' | 'manager' | 'cashier'>('cashier');
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // Buscar usuários com tratamento de erro
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, created_at');

      if (profilesError) {
        setUsers([]);
        return;
      }

      // Buscar roles com tratamento de erro
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) {
        // Continua sem roles se houver erro
      }

      // Combinar dados (sem tentar buscar dados de auth admin)
      const usersWithRoles: UserProfile[] = [];
      
      profiles?.forEach((profile: any) => {
        const roles = userRoles?.filter((r: any) => r.user_id === profile.id).map((r: any) => r.role as string) || [];
        
        usersWithRoles.push({
          id: profile.id,
          email: 'Email protegido', // Não temos acesso aos emails sem admin
          full_name: profile.full_name || 'Nome não informado',
          created_at: profile.created_at,
          roles
        });
      });

      setUsers(usersWithRoles);
    } catch (error) {
      toast({
        title: 'Aviso',
        description: 'Algumas funcionalidades podem não estar disponíveis. Verifique a configuração do banco de dados.',
        variant: 'default',
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, role: 'admin' | 'manager' | 'cashier', action: 'add' | 'remove') => {
    try {
      if (action === 'add') {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: role as any });
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role);
        
        if (error) throw error;
      }

      await loadUsers();
      toast({
        title: 'Role atualizado',
        description: `Role ${role} ${action === 'add' ? 'adicionado' : 'removido'} com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar role',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4" />;
      case 'manager':
        return <Shield className="h-4 w-4" />;
      case 'cashier':
        return <ShoppingCart className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'cashier':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'manager':
        return 'Gerente';
      case 'cashier':
        return 'Operador';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciamento de Usuários</h2>
          <p className="text-muted-foreground">
            Gerencie usuários e suas permissões no sistema
          </p>
        </div>
        <Button onClick={loadUsers}>
          <Users className="mr-2 h-4 w-4" />
          Atualizar Lista
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Administradores</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.roles.includes('admin')).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Gerentes</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.roles.includes('manager')).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Operadores</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.roles.includes('cashier')).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Cadastrado em</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.full_name}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <Badge
                            key={role}
                            className={`${getRoleColor(role)} flex items-center gap-1`}
                          >
                            {getRoleIcon(role)}
                            {getRoleName(role)}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline">Sem role</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Gerenciar Roles - {user.full_name}</DialogTitle>
                          <DialogDescription>
                            Gerencie as permissões e roles deste usuário no sistema.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div>
                            <Label>Roles Atuais</Label>
                            <div className="flex gap-2 mt-2">
                              {user.roles.map((role) => (
                                <Badge
                                  key={role}
                                  className={`${getRoleColor(role)} flex items-center gap-1`}
                                >
                                  {getRoleIcon(role)}
                                  {getRoleName(role)}
                                  <button
                                    onClick={() => updateUserRole(user.id, role as 'admin' | 'manager' | 'cashier', 'remove')}
                                    className="ml-1 hover:bg-black/20 rounded-full p-0.5"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <Label>Adicionar Role</Label>
                            <div className="flex gap-2 mt-2">
                              <Select value={newRole} onValueChange={(value: 'admin' | 'manager' | 'cashier') => setNewRole(value)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cashier">Operador</SelectItem>
                                  <SelectItem value="manager">Gerente</SelectItem>
                                  <SelectItem value="admin">Administrador</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                onClick={() => updateUserRole(user.id, newRole, 'add')}
                                disabled={user.roles.includes(newRole)}
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Informações sobre Roles */}
      <Card>
        <CardHeader>
          <CardTitle>Sobre os Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <Crown className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Administrador</h4>
                <p className="text-sm text-muted-foreground">
                  Acesso total ao sistema, pode gerenciar usuários e configurações
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Gerente</h4>
                <p className="text-sm text-muted-foreground">
                  Pode gerenciar produtos, ver relatórios e configurar o sistema
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <ShoppingCart className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Operador</h4>
                <p className="text-sm text-muted-foreground">
                  Acesso ao PDV e funções básicas de venda
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
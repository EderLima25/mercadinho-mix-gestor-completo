import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AppRole = 'admin' | 'manager' | 'cashier' | 'viewer';

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  cashier: 'Operador',
  viewer: 'Visualizador',
};

/**
 * Matriz de permissões (espelho da função has_permission do banco).
 * O banco continua sendo a fonte da verdade — isto serve apenas para
 * esconder botões que o usuário não pode usar.
 */
const MATRIX: Record<AppRole, string[] | '*'> = {
  admin: '*',
  manager: [
    'products.view', 'products.create', 'products.update', 'products.delete',
    'suppliers.view', 'suppliers.manage', 'categories.manage',
    'sales.view', 'sales.create', 'cash.view', 'cash.open', 'cash.move',
    'reports.view', 'users.view', 'settings.view', 'audit.view',
  ],
  cashier: [
    'products.view', 'sales.view', 'sales.create',
    'cash.view', 'cash.open', 'cash.move', 'reports.view',
  ],
  viewer: ['products.view', 'sales.view', 'cash.view', 'reports.view'],
};

export function usePermissions() {
  const { user, companyId } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user) {
        if (active) { setRoles([]); setLoading(false); }
        return;
      }
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (!active) return;
      setRoles(((data ?? []).map((r: { role: string }) => r.role) as AppRole[]));
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [user, companyId]);

  const can = (permission: string) =>
    roles.some((role) => {
      const allowed = MATRIX[role];
      return allowed === '*' || (allowed ?? []).includes(permission);
    });

  const isAdmin = roles.includes('admin');
  const isViewer = roles.length > 0 && roles.every((r) => r === 'viewer');

  return { roles, can, isAdmin, isViewer, loading };
}

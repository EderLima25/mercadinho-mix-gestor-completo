-- Script para corrigir políticas de segurança RLS
-- Execute este script no SQL Editor do Supabase

-- 1. Remover políticas permissivas atuais
DROP POLICY IF EXISTS "profiles_policy" ON public.profiles;
DROP POLICY IF EXISTS "user_roles_policy" ON public.user_roles;
DROP POLICY IF EXISTS "suppliers_policy" ON public.suppliers;
DROP POLICY IF EXISTS "cash_registers_policy" ON public.cash_registers;
DROP POLICY IF EXISTS "cash_movements_policy" ON public.cash_movements;

-- 2. Criar função para verificar roles do usuário
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = $1 
    AND user_roles.role = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Criar função para verificar se é admin ou manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = $1 
    AND user_roles.role IN ('admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Políticas seguras para PROFILES
-- Usuários podem ver apenas seu próprio perfil
CREATE POLICY "users_can_view_own_profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "users_can_update_own_profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins podem ver todos os perfis
CREATE POLICY "admins_can_view_all_profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 5. Políticas seguras para USER_ROLES
-- Apenas admins podem gerenciar roles
CREATE POLICY "admins_can_manage_roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Usuários podem ver seus próprios roles
CREATE POLICY "users_can_view_own_roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- 6. Políticas seguras para SUPPLIERS
-- Todos os usuários autenticados podem ver fornecedores
CREATE POLICY "authenticated_can_view_suppliers" ON public.suppliers
  FOR SELECT TO authenticated USING (true);

-- Apenas admins e managers podem gerenciar fornecedores
CREATE POLICY "admins_managers_can_manage_suppliers" ON public.suppliers
  FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- 7. Políticas seguras para CASH_REGISTERS
-- Todos os usuários autenticados podem ver caixas
CREATE POLICY "authenticated_can_view_cash_registers" ON public.cash_registers
  FOR SELECT TO authenticated USING (true);

-- Apenas admins, managers e cashiers podem gerenciar caixas
CREATE POLICY "staff_can_manage_cash_registers" ON public.cash_registers
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager') OR 
    public.has_role(auth.uid(), 'cashier')
  );

-- 8. Políticas seguras para CASH_MOVEMENTS
-- Todos os usuários autenticados podem ver movimentações
CREATE POLICY "authenticated_can_view_cash_movements" ON public.cash_movements
  FOR SELECT TO authenticated USING (true);

-- Apenas admins, managers e cashiers podem criar movimentações
CREATE POLICY "staff_can_create_cash_movements" ON public.cash_movements
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager') OR 
    public.has_role(auth.uid(), 'cashier')
  );

-- Apenas admins e managers podem atualizar/deletar movimentações
CREATE POLICY "admins_managers_can_modify_cash_movements" ON public.cash_movements
  FOR UPDATE USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "admins_managers_can_delete_cash_movements" ON public.cash_movements
  FOR DELETE USING (public.is_admin_or_manager(auth.uid()));

-- 9. Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'user_roles', 'suppliers', 'cash_registers', 'cash_movements')
ORDER BY tablename, policyname;

-- Finalizar
SELECT 'Políticas de segurança aplicadas com sucesso!' as resultado;
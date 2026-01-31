-- Corrigir políticas RLS permissivas

-- 1. Products: Restringir INSERT e UPDATE para admin/manager
DROP POLICY IF EXISTS "Anyone can insert products" ON products;
DROP POLICY IF EXISTS "Anyone can update products" ON products;

CREATE POLICY "Admins can insert products" ON products
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins can update products" ON products
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- 2. Sale Items: Restringir INSERT para usuários autenticados com validação
DROP POLICY IF EXISTS "Anyone can create sale items" ON sale_items;

CREATE POLICY "Users can create sale items" ON sale_items
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sales 
    WHERE sales.id = sale_id 
    AND (sales.user_id = auth.uid() OR sales.user_id IS NULL)
  )
);
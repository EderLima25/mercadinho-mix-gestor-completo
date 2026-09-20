-- Checagem central de permissões
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.company_id IS NOT NULL
      AND ur.company_id = public.get_user_company_id(_user_id)
      AND (
        (ur.role = 'admin') OR
        (ur.role = 'manager' AND _permission NOT IN ('users.delete','company.delete','settings.billing')) OR
        (ur.role = 'cashier' AND _permission IN (
          'products.view','sales.view','sales.create','cash.view','cash.open','cash.move','reports.view'
        )) OR
        (ur.role = 'viewer' AND _permission IN (
          'products.view','sales.view','cash.view','reports.view'
        ))
      )
  )
$$;

REVOKE ALL ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated;

-- Visualizador é somente leitura
DROP POLICY IF EXISTS "Create company sales" ON public.sales;
CREATE POLICY "Create company sales"
ON public.sales FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.current_company_id()
  AND user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'sales.create')
);

DROP POLICY IF EXISTS "Create company sale items" ON public.sale_items;
CREATE POLICY "Create company sale items"
ON public.sale_items FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.current_company_id()
  AND public.has_permission(auth.uid(), 'sales.create')
);

DROP POLICY IF EXISTS "Open company cash register" ON public.cash_registers;
CREATE POLICY "Open company cash register"
ON public.cash_registers FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.current_company_id()
  AND user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'cash.open')
);

DROP POLICY IF EXISTS "Create company cash movements" ON public.cash_movements;
CREATE POLICY "Create company cash movements"
ON public.cash_movements FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.current_company_id()
  AND public.has_permission(auth.uid(), 'cash.move')
);
DROP POLICY IF EXISTS "Update company cash register" ON public.cash_registers;

CREATE POLICY "Update own or managed cash register"
ON public.cash_registers
FOR UPDATE
TO authenticated
USING (
  company_id = public.current_company_id()
  AND (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  )
)
WITH CHECK (
  company_id = public.current_company_id()
  AND (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  )
);

CREATE OR REPLACE FUNCTION public.decrement_stock(_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cid uuid := public.current_company_id();
  it jsonb;
BEGIN
  IF auth.uid() IS NULL OR cid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  FOR it IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    UPDATE public.products
    SET stock = GREATEST(0, stock - GREATEST(0, (it->>'quantity')::int))
    WHERE id = (it->>'product_id')::uuid
      AND company_id = cid;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_stock(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decrement_stock(jsonb) TO authenticated;
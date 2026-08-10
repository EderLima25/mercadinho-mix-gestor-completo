CREATE TABLE public.cash_registers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  initial_amount numeric NOT NULL DEFAULT 0,
  final_amount numeric,
  total_sales numeric NOT NULL DEFAULT 0,
  total_cash_sales numeric NOT NULL DEFAULT 0,
  total_card_sales numeric NOT NULL DEFAULT 0,
  total_pix_sales numeric NOT NULL DEFAULT 0,
  withdrawals numeric NOT NULL DEFAULT 0,
  deposits numeric NOT NULL DEFAULT 0,
  is_open boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.cash_registers TO authenticated;
GRANT ALL ON public.cash_registers TO service_role;

ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View company cash registers" ON public.cash_registers
  FOR SELECT TO authenticated USING (company_id = public.current_company_id());

CREATE POLICY "Open company cash register" ON public.cash_registers
  FOR INSERT TO authenticated WITH CHECK (company_id = public.current_company_id() AND user_id = auth.uid());

CREATE POLICY "Update company cash register" ON public.cash_registers
  FOR UPDATE TO authenticated USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

CREATE TRIGGER update_cash_registers_updated_at
  BEFORE UPDATE ON public.cash_registers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.cash_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cash_register_id uuid NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('withdrawal','deposit','sale')),
  amount numeric NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.cash_movements TO authenticated;
GRANT ALL ON public.cash_movements TO service_role;

ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View company cash movements" ON public.cash_movements
  FOR SELECT TO authenticated USING (company_id = public.current_company_id());

CREATE POLICY "Create company cash movements" ON public.cash_movements
  FOR INSERT TO authenticated WITH CHECK (company_id = public.current_company_id());

CREATE INDEX idx_cash_registers_company_open ON public.cash_registers(company_id, is_open);
CREATE INDEX idx_cash_movements_register ON public.cash_movements(cash_register_id);

CREATE OR REPLACE FUNCTION public.update_cash_register_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reg_id uuid;
BEGIN
  SELECT id INTO reg_id
  FROM public.cash_registers
  WHERE is_open = true AND company_id = NEW.company_id
  ORDER BY opened_at DESC
  LIMIT 1;

  IF reg_id IS NOT NULL THEN
    UPDATE public.cash_registers
    SET total_sales = total_sales + NEW.total,
        total_cash_sales = total_cash_sales + CASE WHEN NEW.payment_method = 'cash' THEN NEW.total ELSE 0 END,
        total_card_sales = total_card_sales + CASE WHEN NEW.payment_method IN ('credit','debit') THEN NEW.total ELSE 0 END,
        total_pix_sales = total_pix_sales + CASE WHEN NEW.payment_method = 'pix' THEN NEW.total ELSE 0 END
    WHERE id = reg_id;

    INSERT INTO public.cash_movements (company_id, cash_register_id, user_id, type, amount, description)
    VALUES (NEW.company_id, reg_id, NEW.user_id, 'sale', NEW.total, 'Venda - ' || NEW.payment_method);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_cash_register_on_sale
  AFTER INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_cash_register_on_sale();
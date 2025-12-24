-- Script para adicionar funcionalidades de alta prioridade
-- Execute este script no seu banco Supabase

-- 1. Adicionar parent_id à tabela categories para hierarquia
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- 2. Criar tabela de fornecedores
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj_cpf TEXT NOT NULL UNIQUE,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  contact_person TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Adicionar supplier_id à tabela products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- 4. Criar tabela de controle de caixa
CREATE TABLE IF NOT EXISTS public.cash_registers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  initial_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  final_amount DECIMAL(10,2),
  total_sales DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_cash_sales DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_card_sales DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_pix_sales DECIMAL(10,2) NOT NULL DEFAULT 0,
  withdrawals DECIMAL(10,2) NOT NULL DEFAULT 0,
  deposits DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_open BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Criar tabela de movimentações de caixa
CREATE TABLE IF NOT EXISTS public.cash_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cash_register_id UUID NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('withdrawal', 'deposit', 'sale')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Criar triggers para updated_at
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER update_suppliers_updated_at 
  BEFORE UPDATE ON public.suppliers 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cash_registers_updated_at ON public.cash_registers;
CREATE TRIGGER update_cash_registers_updated_at 
  BEFORE UPDATE ON public.cash_registers 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Habilitar RLS nas novas tabelas
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

-- 9. Criar políticas de segurança para suppliers
DROP POLICY IF EXISTS "Anyone can view suppliers" ON public.suppliers;
CREATE POLICY "Anyone can view suppliers" ON public.suppliers
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage suppliers" ON public.suppliers;
CREATE POLICY "Admins can manage suppliers" ON public.suppliers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- 10. Criar políticas de segurança para cash_registers
DROP POLICY IF EXISTS "Anyone can view cash registers" ON public.cash_registers;
CREATE POLICY "Anyone can view cash registers" ON public.cash_registers
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage cash registers" ON public.cash_registers;
CREATE POLICY "Admins can manage cash registers" ON public.cash_registers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'cashier'));

-- 11. Criar políticas de segurança para cash_movements
DROP POLICY IF EXISTS "Anyone can view cash movements" ON public.cash_movements;
CREATE POLICY "Anyone can view cash movements" ON public.cash_movements
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage cash movements" ON public.cash_movements;
CREATE POLICY "Admins can manage cash movements" ON public.cash_movements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'cashier'));

-- 12. Criar função para atualizar totais do caixa quando uma venda é feita
CREATE OR REPLACE FUNCTION public.update_cash_register_on_sale()
RETURNS TRIGGER AS $$
DECLARE
  current_register_id UUID;
  sale_amount DECIMAL(10,2);
BEGIN
  -- Buscar o caixa aberto atual
  SELECT id INTO current_register_id
  FROM public.cash_registers
  WHERE is_open = true
  ORDER BY opened_at DESC
  LIMIT 1;

  IF current_register_id IS NOT NULL THEN
    sale_amount := NEW.total;
    
    -- Atualizar totais do caixa
    UPDATE public.cash_registers
    SET 
      total_sales = total_sales + sale_amount,
      total_cash_sales = CASE 
        WHEN NEW.payment_method = 'cash' THEN total_cash_sales + sale_amount
        ELSE total_cash_sales
      END,
      total_card_sales = CASE 
        WHEN NEW.payment_method IN ('credit', 'debit') THEN total_card_sales + sale_amount
        ELSE total_card_sales
      END,
      total_pix_sales = CASE 
        WHEN NEW.payment_method = 'pix' THEN total_pix_sales + sale_amount
        ELSE total_pix_sales
      END
    WHERE id = current_register_id;

    -- Registrar movimentação de venda
    INSERT INTO public.cash_movements (cash_register_id, user_id, type, amount, description)
    VALUES (
      current_register_id,
      NEW.user_id,
      'sale',
      sale_amount,
      'Venda - ' || NEW.payment_method
    );
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

-- 13. Criar trigger para atualizar caixa nas vendas
DROP TRIGGER IF EXISTS update_cash_register_on_sale ON public.sales;
CREATE TRIGGER update_cash_register_on_sale
  AFTER INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_cash_register_on_sale();

-- 14. Inserir fornecedores de exemplo
INSERT INTO public.suppliers (name, cnpj_cpf, email, phone, city, contact_person, is_active)
VALUES 
  ('Distribuidora Central', '12.345.678/0001-90', 'contato@distribuidoracentral.com', '(11) 3456-7890', 'São Paulo', 'João Silva', true),
  ('Atacado do Norte', '98.765.432/0001-10', 'vendas@atacadonorte.com', '(85) 2345-6789', 'Fortaleza', 'Maria Santos', true),
  ('Fornecedor Local Ltda', '11.222.333/0001-44', 'local@fornecedor.com', '(11) 9876-5432', 'São Paulo', 'Pedro Costa', true)
ON CONFLICT (cnpj_cpf) DO NOTHING;

-- 15. Conceder permissões
GRANT ALL ON public.suppliers TO authenticated;
GRANT ALL ON public.cash_registers TO authenticated;
GRANT ALL ON public.cash_movements TO authenticated;

-- 16. Atualizar algumas categorias para ter hierarquia (exemplo)
UPDATE public.categories 
SET parent_id = (SELECT id FROM public.categories WHERE name = 'Bebidas' LIMIT 1)
WHERE name IN ('Refrigerantes', 'Sucos') 
AND EXISTS (SELECT 1 FROM public.categories WHERE name = 'Bebidas');

-- Inserir subcategorias de exemplo se não existirem
INSERT INTO public.categories (name, color, parent_id)
SELECT 'Refrigerantes', '#3498DB', c.id
FROM public.categories c
WHERE c.name = 'Bebidas'
AND NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Refrigerantes');

INSERT INTO public.categories (name, color, parent_id)
SELECT 'Sucos', '#27AE60', c.id
FROM public.categories c
WHERE c.name = 'Bebidas'
AND NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Sucos');

-- Finalizar
SELECT 'Script executado com sucesso! Funcionalidades de alta prioridade adicionadas.' as resultado;
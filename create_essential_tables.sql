-- Script simplificado para criar apenas as tabelas essenciais
-- Execute este script no SQL Editor do Supabase

-- 1. Criar tabela de fornecedores
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

-- 2. Criar tabela de controle de caixa
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

-- 3. Criar tabela de movimentações de caixa
CREATE TABLE IF NOT EXISTS public.cash_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cash_register_id UUID NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('withdrawal', 'deposit', 'sale')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Adicionar parent_id à tabela categories (se não existir)
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- 5. Adicionar supplier_id à tabela products (se não existir)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- 6. Habilitar RLS nas novas tabelas
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

-- 7. Criar políticas básicas de segurança
CREATE POLICY "Enable read access for all users" ON public.suppliers FOR SELECT USING (true);
CREATE POLICY "Enable all access for authenticated users" ON public.suppliers FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable read access for all users" ON public.cash_registers FOR SELECT USING (true);
CREATE POLICY "Enable all access for authenticated users" ON public.cash_registers FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable read access for all users" ON public.cash_movements FOR SELECT USING (true);
CREATE POLICY "Enable all access for authenticated users" ON public.cash_movements FOR ALL TO authenticated USING (true);

-- 8. Inserir dados de exemplo
INSERT INTO public.suppliers (name, cnpj_cpf, email, phone, city, contact_person, is_active)
VALUES 
  ('Distribuidora Central', '12.345.678/0001-90', 'contato@distribuidoracentral.com', '(11) 3456-7890', 'São Paulo', 'João Silva', true),
  ('Atacado do Norte', '98.765.432/0001-10', 'vendas@atacadonorte.com', '(85) 2345-6789', 'Fortaleza', 'Maria Santos', true)
ON CONFLICT (cnpj_cpf) DO NOTHING;

-- Finalizar
SELECT 'Tabelas criadas com sucesso!' as resultado;
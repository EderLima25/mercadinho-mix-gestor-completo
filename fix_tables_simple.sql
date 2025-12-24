-- Script simplificado para corrigir as tabelas
-- Execute este script no SQL Editor do Supabase

-- 1. Remover tabelas se existirem (para recriação limpa)
DROP TABLE IF EXISTS public.cash_movements CASCADE;
DROP TABLE IF EXISTS public.cash_registers CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;

-- 2. Criar tabela de fornecedores
CREATE TABLE public.suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj_cpf TEXT NOT NULL UNIQUE,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  contact_person TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Criar tabela de controle de caixa
CREATE TABLE public.cash_registers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  initial_amount DECIMAL(10,2) DEFAULT 0,
  final_amount DECIMAL(10,2),
  total_sales DECIMAL(10,2) DEFAULT 0,
  total_cash_sales DECIMAL(10,2) DEFAULT 0,
  total_card_sales DECIMAL(10,2) DEFAULT 0,
  total_pix_sales DECIMAL(10,2) DEFAULT 0,
  withdrawals DECIMAL(10,2) DEFAULT 0,
  deposits DECIMAL(10,2) DEFAULT 0,
  is_open BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Criar tabela de movimentações de caixa
CREATE TABLE public.cash_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cash_register_id UUID NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('withdrawal', 'deposit', 'sale')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Adicionar colunas às tabelas existentes (se não existirem)
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- 6. Habilitar RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

-- 7. Criar políticas simples (permissivas para desenvolvimento)
CREATE POLICY "suppliers_policy" ON public.suppliers FOR ALL USING (true);
CREATE POLICY "cash_registers_policy" ON public.cash_registers FOR ALL USING (true);
CREATE POLICY "cash_movements_policy" ON public.cash_movements FOR ALL USING (true);

-- 8. Inserir dados de exemplo
INSERT INTO public.suppliers (name, cnpj_cpf, email, phone, city, contact_person, is_active)
VALUES 
  ('Distribuidora Central', '12345678000190', 'contato@distribuidoracentral.com', '(11) 3456-7890', 'São Paulo', 'João Silva', true),
  ('Atacado do Norte', '98765432000110', 'vendas@atacadonorte.com', '(85) 2345-6789', 'Fortaleza', 'Maria Santos', true)
ON CONFLICT (cnpj_cpf) DO NOTHING;

-- 9. Verificar se as tabelas foram criadas
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('suppliers', 'cash_registers', 'cash_movements')
ORDER BY table_name;

-- Finalizar
SELECT 'Tabelas criadas e configuradas com sucesso!' as resultado;
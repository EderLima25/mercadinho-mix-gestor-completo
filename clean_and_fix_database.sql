-- Script para limpar e reconstruir o banco de dados corretamente
-- Execute este script no SQL Editor do Supabase

-- 1. Primeiro, vamos limpar completamente as tabelas problemáticas
DROP TABLE IF EXISTS public.cash_movements CASCADE;
DROP TABLE IF EXISTS public.cash_registers CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- 2. Limpar e recriar a tabela profiles corretamente
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 3. Criar tabela profiles com a estrutura correta
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Criar tabela user_roles
CREATE TABLE public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cashier', 'manager')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 5. Criar tabela de fornecedores
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

-- 6. Criar tabela de controle de caixa
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

-- 7. Criar tabela de movimentações de caixa
CREATE TABLE public.cash_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cash_register_id UUID NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('withdrawal', 'deposit', 'sale')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Adicionar colunas às tabelas existentes (se não existirem)
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- 9. Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

-- 10. Criar políticas permissivas para desenvolvimento
CREATE POLICY "profiles_policy" ON public.profiles FOR ALL USING (true);
CREATE POLICY "user_roles_policy" ON public.user_roles FOR ALL USING (true);
CREATE POLICY "suppliers_policy" ON public.suppliers FOR ALL USING (true);
CREATE POLICY "cash_registers_policy" ON public.cash_registers FOR ALL USING (true);
CREATE POLICY "cash_movements_policy" ON public.cash_movements FOR ALL USING (true);

-- 11. Criar perfis para todos os usuários existentes
INSERT INTO public.profiles (id, full_name, created_at)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', email, 'Usuário') as full_name,
  created_at
FROM auth.users;

-- 12. Criar roles admin para todos os usuários existentes
INSERT INTO public.user_roles (user_id, role)
SELECT 
  id, 
  'admin' as role
FROM auth.users;

-- 13. Inserir dados de exemplo para fornecedores
INSERT INTO public.suppliers (name, cnpj_cpf, email, phone, city, contact_person, is_active)
VALUES 
  ('Distribuidora Central', '12345678000190', 'contato@distribuidoracentral.com', '(11) 3456-7890', 'São Paulo', 'João Silva', true),
  ('Atacado do Norte', '98765432000110', 'vendas@atacadonorte.com', '(85) 2345-6789', 'Fortaleza', 'Maria Santos', true),
  ('Fornecedor Local', '11122233000144', 'local@fornecedor.com', '(11) 9876-5432', 'São Paulo', 'Pedro Costa', true);

-- 14. Criar função para novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar perfil
  INSERT INTO public.profiles (id, full_name, created_at)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Usuário'),
    NEW.created_at
  );
  
  -- Atribuir role padrão
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'cashier');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Criar trigger para novos usuários
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 16. Verificar se tudo foi criado corretamente
SELECT 
  'Tabelas criadas:' as info,
  COUNT(*) as total
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'user_roles', 'suppliers', 'cash_registers', 'cash_movements');

-- 17. Verificar dados inseridos
SELECT 'profiles' as tabela, COUNT(*) as registros FROM public.profiles
UNION ALL
SELECT 'user_roles' as tabela, COUNT(*) as registros FROM public.user_roles
UNION ALL
SELECT 'suppliers' as tabela, COUNT(*) as registros FROM public.suppliers;

-- 18. Verificar estrutura da tabela profiles
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Finalizar
SELECT 'Banco de dados limpo e reconstruído com sucesso!' as resultado;
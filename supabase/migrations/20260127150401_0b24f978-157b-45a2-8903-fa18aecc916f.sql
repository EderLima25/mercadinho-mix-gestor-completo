-- Adicionar colunas faltantes na tabela products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS internal_code TEXT,
ADD COLUMN IF NOT EXISTS sell_by_weight BOOLEAN NOT NULL DEFAULT false;

-- Criar índice para código interno
CREATE INDEX IF NOT EXISTS idx_products_internal_code ON public.products(internal_code);

-- Criar índice para produtos ativos
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);

-- Adicionar constraint UNIQUE para name em categories (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'categories_name_key' 
        AND conrelid = 'public.categories'::regclass
    ) THEN
        ALTER TABLE public.categories ADD CONSTRAINT categories_name_key UNIQUE (name);
    END IF;
END $$;

-- Adicionar categorias faltantes identificadas no Excel
INSERT INTO public.categories (name, color) VALUES 
  ('Alimentos Básicos', '#8B4513'),
  ('Limpeza', '#00CED1'),
  ('Perfumaria', '#FF69B4'),
  ('Higiene', '#87CEEB'),
  ('Higiene Pessoal', '#4682B4'),
  ('Bebidas Não Alcoólicas', '#FFA500'),
  ('Biscoitos e Doces', '#FF6347'),
  ('Massas e Molhos', '#DAA520'),
  ('Padaria e Confeitaria', '#D2691E'),
  ('Açougue', '#DC143C'),
  ('Cadastro Rápido', '#808080')
ON CONFLICT (name) DO NOTHING;
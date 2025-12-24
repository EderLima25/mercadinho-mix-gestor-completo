-- Script mínimo para configurar apenas as tabelas essenciais
-- Use este script se o setup_database.sql ainda der erro

-- Create app roles enum (safe)
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'cashier', 'manager');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create only the essential tables
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#E67E22',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  barcode TEXT NOT NULL UNIQUE,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 5,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  unit TEXT NOT NULL DEFAULT 'un',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'cashier',
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Simple policies (permissive for now)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.categories;
CREATE POLICY "Enable read access for all users" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.categories;
CREATE POLICY "Enable all access for authenticated users" ON public.categories FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;
CREATE POLICY "Enable read access for all users" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.products;
CREATE POLICY "Enable all access for authenticated users" ON public.products FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON public.sales;
CREATE POLICY "Enable read access for all users" ON public.sales FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.sales;
CREATE POLICY "Enable all access for authenticated users" ON public.sales FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON public.sale_items;
CREATE POLICY "Enable read access for all users" ON public.sale_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.sale_items;
CREATE POLICY "Enable all access for authenticated users" ON public.sale_items FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_roles;
CREATE POLICY "Enable read access for all users" ON public.user_roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.user_roles;
CREATE POLICY "Enable all access for authenticated users" ON public.user_roles FOR ALL TO authenticated USING (true);

-- Insert default categories
INSERT INTO public.categories (name, color) 
SELECT * FROM (VALUES
  ('Alimentos', '#E67E22'),
  ('Bebidas', '#3498DB'),
  ('Limpeza', '#27AE60'),
  ('Higiene', '#9B59B6'),
  ('Outros', '#95A5A6')
) AS v(name, color)
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE categories.name = v.name);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

SELECT 'Minimal database setup completed! The application should work now.' as message;
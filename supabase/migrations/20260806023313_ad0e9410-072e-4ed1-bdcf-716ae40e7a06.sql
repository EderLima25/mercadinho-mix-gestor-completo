-- 1. Companies table
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  document text,
  phone text,
  email text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Wipe existing tenant data
DELETE FROM public.sale_items;
DELETE FROM public.sales;
DELETE FROM public.products;
DELETE FROM public.categories;
DELETE FROM public.suppliers;

-- 3. Add company_id columns
ALTER TABLE public.profiles    ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles  ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.products    ADD COLUMN company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.categories  ADD COLUMN company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.suppliers   ADD COLUMN company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.sales       ADD COLUMN company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.sale_items  ADD COLUMN company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX idx_products_company   ON public.products(company_id);
CREATE INDEX idx_categories_company ON public.categories(company_id);
CREATE INDEX idx_suppliers_company  ON public.suppliers(company_id);
CREATE INDEX idx_sales_company      ON public.sales(company_id);
CREATE INDEX idx_sale_items_company ON public.sale_items(company_id);
CREATE INDEX idx_profiles_company   ON public.profiles(company_id);

-- 4. Helper functions
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND (ur.company_id IS NULL OR ur.company_id = public.get_user_company_id(_user_id))
  )
$$;

-- 5. Signup: create company + profile + admin role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id uuid;
BEGIN
  INSERT INTO public.companies (name)
  VALUES (COALESCE(NULLIF(trim(new.raw_user_meta_data ->> 'company_name'), ''), 'Minha Empresa'))
  RETURNING id INTO new_company_id;

  INSERT INTO public.profiles (id, full_name, company_id)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', new_company_id);

  INSERT INTO public.user_roles (user_id, role, company_id)
  VALUES (new.id, 'admin', new_company_id);

  RETURN new;
END;
$$;

-- 6. Companies policies
CREATE POLICY "Members can view own company" ON public.companies
FOR SELECT TO authenticated USING (id = public.current_company_id());

CREATE POLICY "Admins can update own company" ON public.companies
FOR UPDATE TO authenticated
USING (id = public.current_company_id() AND public.has_role(auth.uid(), 'admin'));

-- 7. Replace tenant policies
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "View company categories" ON public.categories
FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "Manage company categories" ON public.categories
FOR ALL TO authenticated
USING (company_id = public.current_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')))
WITH CHECK (company_id = public.current_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')));

DROP POLICY IF EXISTS "Anyone can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can manage suppliers" ON public.suppliers;
CREATE POLICY "View company suppliers" ON public.suppliers
FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "Manage company suppliers" ON public.suppliers
FOR ALL TO authenticated
USING (company_id = public.current_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')))
WITH CHECK (company_id = public.current_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')));

DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "View company products" ON public.products
FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "Manage company products" ON public.products
FOR ALL TO authenticated
USING (company_id = public.current_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')))
WITH CHECK (company_id = public.current_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')));

DROP POLICY IF EXISTS "Anyone can view sales" ON public.sales;
DROP POLICY IF EXISTS "Users can create sales" ON public.sales;
CREATE POLICY "View company sales" ON public.sales
FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "Create company sales" ON public.sales
FOR INSERT TO authenticated
WITH CHECK (company_id = public.current_company_id() AND user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can view sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Users can create sale items" ON public.sale_items;
CREATE POLICY "View company sale items" ON public.sale_items
FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "Create company sale items" ON public.sale_items
FOR INSERT TO authenticated
WITH CHECK (company_id = public.current_company_id());

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "View company profiles" ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid() OR company_id = public.current_company_id());

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "View company roles" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR company_id = public.current_company_id());
CREATE POLICY "Admins manage company roles" ON public.user_roles
FOR ALL TO authenticated
USING (company_id = public.current_company_id() AND public.has_role(auth.uid(),'admin'))
WITH CHECK (company_id = public.current_company_id() AND public.has_role(auth.uid(),'admin'));
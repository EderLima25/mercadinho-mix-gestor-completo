-- =========================
-- 1. CONVITES DE FUNCIONÁRIOS
-- =========================
CREATE TABLE public.company_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role app_role NOT NULL DEFAULT 'cashier',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid,
  accepted_by uuid,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_invites_company ON public.company_invites(company_id);
CREATE INDEX idx_company_invites_token ON public.company_invites(token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_invites TO authenticated;
GRANT ALL ON public.company_invites TO service_role;

ALTER TABLE public.company_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage company invites"
ON public.company_invites FOR ALL TO authenticated
USING (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members view company invites"
ON public.company_invites FOR SELECT TO authenticated
USING (company_id = public.current_company_id());

-- Consulta pública controlada de um convite pelo código (sem expor a tabela)
CREATE OR REPLACE FUNCTION public.get_invite_info(_token text)
RETURNS TABLE (company_name text, email text, role app_role, valid boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.name, i.email, i.role,
         (i.status = 'pending' AND i.expires_at > now())
  FROM public.company_invites i
  JOIN public.companies c ON c.id = i.company_id
  WHERE i.token = _token
$$;

REVOKE EXECUTE ON FUNCTION public.get_invite_info(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_invite_info(text) TO anon, authenticated;

-- Aceite de convite por usuário já autenticado
CREATE OR REPLACE FUNCTION public.accept_invite(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  inv public.company_invites%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT * INTO inv FROM public.company_invites
  WHERE token = _token AND status = 'pending' AND expires_at > now();

  IF inv.id IS NULL THEN
    RAISE EXCEPTION 'Convite inválido ou expirado';
  END IF;

  UPDATE public.profiles SET company_id = inv.company_id WHERE id = uid;
  INSERT INTO public.profiles (id, company_id)
  SELECT uid, inv.company_id
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = uid);

  DELETE FROM public.user_roles WHERE user_id = uid;
  INSERT INTO public.user_roles (user_id, role, company_id)
  VALUES (uid, inv.role, inv.company_id);

  UPDATE public.company_invites
  SET status = 'accepted', accepted_at = now(), accepted_by = uid
  WHERE id = inv.id;

  RETURN inv.company_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_invite(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.accept_invite(text) TO authenticated;

-- =========================
-- 2. ASSINATURA / COBRANÇA PIX MANUAL
-- =========================
CREATE TABLE public.platform_admins (
  user_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _user_id)
$$;

REVOKE EXECUTE ON FUNCTION public.is_platform_admin(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated;

CREATE POLICY "Platform admins view themselves"
ON public.platform_admins FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'basico',
  status text NOT NULL DEFAULT 'trial',
  amount numeric NOT NULL DEFAULT 49.90,
  trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own subscription"
ON public.subscriptions FOR SELECT TO authenticated
USING (company_id = public.current_company_id() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins manage subscriptions"
ON public.subscriptions FOR ALL TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid,
  amount numeric NOT NULL,
  months integer NOT NULL DEFAULT 1,
  method text NOT NULL DEFAULT 'pix',
  reference text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_payments_company ON public.subscription_payments(company_id);

GRANT SELECT, INSERT ON public.subscription_payments TO authenticated;
GRANT ALL ON public.subscription_payments TO service_role;

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view company payments"
ON public.subscription_payments FOR SELECT TO authenticated
USING (company_id = public.current_company_id() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Admins declare company payments"
ON public.subscription_payments FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.current_company_id()
  AND user_id = auth.uid()
  AND public.has_role(auth.uid(), 'admin')
  AND status = 'pending'
);

CREATE POLICY "Platform admins review payments"
ON public.subscription_payments FOR UPDATE TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

-- Assinatura em teste para empresas já existentes
INSERT INTO public.subscriptions (company_id)
SELECT id FROM public.companies
ON CONFLICT (company_id) DO NOTHING;

-- =========================
-- 3. CADASTRO: CONVITE OU NOVA EMPRESA
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id uuid;
  inv public.company_invites%ROWTYPE;
  invite_token text := nullif(trim(new.raw_user_meta_data ->> 'invite_token'), '');
BEGIN
  IF invite_token IS NOT NULL THEN
    SELECT * INTO inv FROM public.company_invites
    WHERE token = invite_token AND status = 'pending' AND expires_at > now();
  END IF;

  IF inv.id IS NOT NULL THEN
    INSERT INTO public.profiles (id, full_name, company_id)
    VALUES (new.id, new.raw_user_meta_data ->> 'full_name', inv.company_id);

    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (new.id, inv.role, inv.company_id);

    UPDATE public.company_invites
    SET status = 'accepted', accepted_at = now(), accepted_by = new.id
    WHERE id = inv.id;

    RETURN new;
  END IF;

  INSERT INTO public.companies (name)
  VALUES (COALESCE(NULLIF(trim(new.raw_user_meta_data ->> 'company_name'), ''), 'Minha Empresa'))
  RETURNING id INTO new_company_id;

  INSERT INTO public.profiles (id, full_name, company_id)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', new_company_id);

  INSERT INTO public.user_roles (user_id, role, company_id)
  VALUES (new.id, 'admin', new_company_id);

  INSERT INTO public.subscriptions (company_id)
  VALUES (new_company_id)
  ON CONFLICT (company_id) DO NOTHING;

  RETURN new;
END;
$$;

-- Nova empresa criada via ensure_company também ganha assinatura
CREATE OR REPLACE FUNCTION public.ensure_company(_company_name text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cid uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT company_id INTO cid FROM public.profiles WHERE id = uid;
  IF cid IS NOT NULL THEN
    RETURN cid;
  END IF;

  INSERT INTO public.companies (name)
  VALUES (COALESCE(NULLIF(trim(_company_name), ''), 'Minha Empresa'))
  RETURNING id INTO cid;

  INSERT INTO public.profiles (id, company_id)
  VALUES (uid, cid)
  ON CONFLICT (id) DO UPDATE SET company_id = EXCLUDED.company_id;

  UPDATE public.user_roles SET company_id = cid WHERE user_id = uid AND company_id IS NULL;

  INSERT INTO public.user_roles (user_id, role, company_id)
  SELECT uid, 'admin', cid
  WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = uid);

  INSERT INTO public.subscriptions (company_id)
  VALUES (cid)
  ON CONFLICT (company_id) DO NOTHING;

  RETURN cid;
END;
$$;
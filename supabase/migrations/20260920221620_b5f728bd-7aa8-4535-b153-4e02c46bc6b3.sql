-- 1) Novo cargo: viewer
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';

-- 2) Auditoria
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid,
  user_email text,
  action text NOT NULL,
  entity text,
  entity_id text,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view company audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS audit_logs_company_created_idx ON public.audit_logs (company_id, created_at DESC);

-- Registro de auditoria (somente via função, nunca insert direto do cliente)
CREATE OR REPLACE FUNCTION public.log_audit(
  _action text,
  _entity text DEFAULT NULL,
  _entity_id text DEFAULT NULL,
  _description text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cid uuid;
  mail text;
BEGIN
  IF uid IS NULL THEN
    RETURN;
  END IF;
  SELECT company_id INTO cid FROM public.profiles WHERE id = uid;
  SELECT email INTO mail FROM auth.users WHERE id = uid;
  INSERT INTO public.audit_logs (company_id, user_id, user_email, action, entity, entity_id, description, metadata)
  VALUES (cid, uid, mail, _action, _entity, _entity_id, _description, COALESCE(_metadata, '{}'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit(text, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, text, text, jsonb) TO authenticated;

-- 3) Tentativas de login / bloqueio temporário
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
-- nenhuma policy: acesso apenas pelas funções security definer

CREATE INDEX IF NOT EXISTS login_attempts_email_created_idx ON public.login_attempts (lower(email), created_at DESC);

CREATE OR REPLACE FUNCTION public.login_block_seconds(_email text)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fails int;
  last_fail timestamptz;
  last_ok timestamptz;
BEGIN
  SELECT max(created_at) INTO last_ok
  FROM public.login_attempts
  WHERE lower(email) = lower(_email) AND success = true;

  SELECT count(*), max(created_at) INTO fails, last_fail
  FROM public.login_attempts
  WHERE lower(email) = lower(_email)
    AND success = false
    AND created_at > now() - interval '15 minutes'
    AND (last_ok IS NULL OR created_at > last_ok);

  IF fails >= 5 AND last_fail IS NOT NULL THEN
    RETURN GREATEST(0, CEIL(EXTRACT(EPOCH FROM (last_fail + interval '15 minutes' - now())))::int);
  END IF;
  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_login_attempt(_email text, _success boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _email IS NULL OR length(trim(_email)) = 0 OR length(_email) > 320 THEN
    RETURN;
  END IF;

  INSERT INTO public.login_attempts (email, success) VALUES (lower(trim(_email)), _success);

  DELETE FROM public.login_attempts WHERE created_at < now() - interval '30 days';
END;
$$;

REVOKE ALL ON FUNCTION public.login_block_seconds(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_login_attempt(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.login_block_seconds(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, boolean) TO anon, authenticated;

-- 4) Validações de dados
ALTER TABLE public.products
  ADD CONSTRAINT products_price_non_negative CHECK (price >= 0) NOT VALID,
  ADD CONSTRAINT products_cost_non_negative CHECK (cost_price >= 0) NOT VALID,
  ADD CONSTRAINT products_stock_non_negative CHECK (stock >= 0) NOT VALID,
  ADD CONSTRAINT products_name_not_blank CHECK (length(trim(name)) > 0) NOT VALID;

ALTER TABLE public.sale_items
  ADD CONSTRAINT sale_items_quantity_positive CHECK (quantity > 0) NOT VALID,
  ADD CONSTRAINT sale_items_unit_price_non_negative CHECK (unit_price >= 0) NOT VALID,
  ADD CONSTRAINT sale_items_subtotal_non_negative CHECK (subtotal >= 0) NOT VALID;

ALTER TABLE public.sales
  ADD CONSTRAINT sales_total_non_negative CHECK (total >= 0) NOT VALID;

-- 5) Auditoria automática de eventos sensíveis
CREATE OR REPLACE FUNCTION public.audit_product_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mail text;
BEGIN
  SELECT email INTO mail FROM auth.users WHERE id = auth.uid();

  IF TG_OP = 'UPDATE' AND NEW.price IS DISTINCT FROM OLD.price THEN
    INSERT INTO public.audit_logs (company_id, user_id, user_email, action, entity, entity_id, description, metadata)
    VALUES (NEW.company_id, auth.uid(), mail, 'product.price_changed', 'product', NEW.id::text,
            'Alterou preço de ' || NEW.name,
            jsonb_build_object('de', OLD.price, 'para', NEW.price));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (company_id, user_id, user_email, action, entity, entity_id, description)
    VALUES (OLD.company_id, auth.uid(), mail, 'product.deleted', 'product', OLD.id::text, 'Excluiu o produto ' || OLD.name);
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_products ON public.products;
CREATE TRIGGER audit_products
AFTER UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.audit_product_changes();

CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mail text;
BEGIN
  SELECT email INTO mail FROM auth.users WHERE id = auth.uid();
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (company_id, user_id, user_email, action, entity, entity_id, description, metadata)
    VALUES (OLD.company_id, auth.uid(), mail, 'user_role.removed', 'user_role', OLD.user_id::text,
            'Removeu o cargo de um usuário', jsonb_build_object('cargo', OLD.role));
    RETURN OLD;
  END IF;
  INSERT INTO public.audit_logs (company_id, user_id, user_email, action, entity, entity_id, description, metadata)
  VALUES (NEW.company_id, auth.uid(), mail,
          CASE WHEN TG_OP = 'INSERT' THEN 'user_role.granted' ELSE 'user_role.changed' END,
          'user_role', NEW.user_id::text, 'Definiu cargo de usuário',
          jsonb_build_object('cargo', NEW.role));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_role_changes();

CREATE OR REPLACE FUNCTION public.audit_invite_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mail text;
BEGIN
  SELECT email INTO mail FROM auth.users WHERE id = auth.uid();
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (company_id, user_id, user_email, action, entity, entity_id, description, metadata)
    VALUES (NEW.company_id, auth.uid(), mail, 'invite.created', 'invite', NEW.id::text,
            'Criou convite para ' || NEW.email, jsonb_build_object('cargo', NEW.role));
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.audit_logs (company_id, user_id, user_email, action, entity, entity_id, description, metadata)
    VALUES (NEW.company_id, COALESCE(auth.uid(), NEW.accepted_by), mail, 'invite.' || NEW.status, 'invite', NEW.id::text,
            'Convite de ' || NEW.email || ' agora está ' || NEW.status, '{}'::jsonb);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_invites ON public.company_invites;
CREATE TRIGGER audit_invites
AFTER INSERT OR UPDATE ON public.company_invites
FOR EACH ROW EXECUTE FUNCTION public.audit_invite_changes();

CREATE OR REPLACE FUNCTION public.audit_sale_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mail text;
BEGIN
  SELECT email INTO mail FROM auth.users WHERE id = NEW.user_id;
  INSERT INTO public.audit_logs (company_id, user_id, user_email, action, entity, entity_id, description, metadata)
  VALUES (NEW.company_id, NEW.user_id, mail, 'sale.created', 'sale', NEW.id::text,
          'Registrou venda', jsonb_build_object('total', NEW.total, 'pagamento', NEW.payment_method));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_sales ON public.sales;
CREATE TRIGGER audit_sales
AFTER INSERT ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.audit_sale_created();

CREATE OR REPLACE FUNCTION public.audit_payment_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mail text;
BEGIN
  SELECT email INTO mail FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.audit_logs (company_id, user_id, user_email, action, entity, entity_id, description, metadata)
  VALUES (NEW.company_id, auth.uid(), mail,
          CASE WHEN TG_OP = 'INSERT' THEN 'subscription_payment.declared' ELSE 'subscription_payment.' || NEW.status END,
          'subscription_payment', NEW.id::text, 'Pagamento de assinatura',
          jsonb_build_object('valor', NEW.amount, 'status', NEW.status));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_subscription_payments ON public.subscription_payments;
CREATE TRIGGER audit_subscription_payments
AFTER INSERT OR UPDATE ON public.subscription_payments
FOR EACH ROW EXECUTE FUNCTION public.audit_payment_changes();
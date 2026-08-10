CREATE OR REPLACE FUNCTION public.ensure_company(_company_name text DEFAULT NULL)
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

  RETURN cid;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_company(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_company(text) TO authenticated;
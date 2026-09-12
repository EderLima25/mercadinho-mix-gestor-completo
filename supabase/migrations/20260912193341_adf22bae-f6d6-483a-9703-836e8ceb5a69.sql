-- 1) Convites visíveis apenas para admins
DROP POLICY IF EXISTS "Members view company invites" ON public.company_invites;

-- 2) has_role passa a exigir empresa correspondente
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND ur.company_id IS NOT NULL
      AND ur.company_id = public.get_user_company_id(_user_id)
  )
$$;
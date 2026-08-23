REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.sales FROM anon;
REVOKE ALL ON public.user_roles FROM anon;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON public.sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.sales TO service_role;
GRANT ALL ON public.user_roles TO service_role;

DROP POLICY IF EXISTS "View company roles" ON public.user_roles;
CREATE POLICY "View company roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR company_id = public.current_company_id()));
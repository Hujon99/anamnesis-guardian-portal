
-- 1) Remove the permissive SELECT policy that exposes all organizations
DROP POLICY IF EXISTS "Allow authenticated users to select organizations" ON public.organizations;

-- 2) Tighten INSERT policy:
--    Previously: any authenticated user could insert any organization row (overly permissive).
--    Now: users can only insert a row whose id equals their current org_id.
DROP POLICY IF EXISTS "Allow authenticated users to insert organizations" ON public.organizations;

CREATE POLICY "Users can insert their own organization record"
  ON public.organizations
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'org_id') = id);

-- 3) Keep existing restricted SELECT policy:
--    "Users can view their organizations" already exists and limits reads to:
--    USING (id = (auth.jwt() ->> 'org_id'))

-- 4) Optional: allow service_role to view organizations (useful for backend tasks)
--    This does not grant any extra rights to end users, only to tokens with role=service_role.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organizations'
      AND policyname = 'Service role can view organizations'
  ) THEN
    CREATE POLICY "Service role can view organizations"
      ON public.organizations
      FOR SELECT
      USING ((auth.jwt() ->> 'role') = 'service_role');
  END IF;
END $$;

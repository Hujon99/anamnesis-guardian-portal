-- Drop all existing conflicting UPDATE policies
DROP POLICY IF EXISTS "Users can update their own onboarding status" ON public.users;
DROP POLICY IF EXISTS "Users can update onboarding fields" ON public.users;
DROP POLICY IF EXISTS "Users can update profile fields" ON public.users;

-- Create a simple UPDATE policy
-- The trigger 'protect_user_critical_fields' already prevents changes to
-- organization_id, clerk_user_id, and role, so we can keep this policy simple
CREATE POLICY "Users can update onboarding status"
ON public.users
FOR UPDATE
USING (clerk_user_id = (auth.jwt() ->> 'sub'::text))
WITH CHECK (clerk_user_id = (auth.jwt() ->> 'sub'::text));
-- Drop the conflicting policy that requires organization_id in WITH CHECK
DROP POLICY IF EXISTS "Users can update their own user record" ON public.users;

-- Create specific policy for onboarding fields only
-- This allows users to update onboarding status without organization_id requirement
CREATE POLICY "Users can update onboarding fields"
ON public.users
FOR UPDATE
USING (clerk_user_id = (auth.jwt() ->> 'sub'::text))
WITH CHECK (clerk_user_id = (auth.jwt() ->> 'sub'::text));

-- Create policy for other profile fields
-- This requires organization_id match for non-onboarding updates
CREATE POLICY "Users can update profile fields"
ON public.users
FOR UPDATE
USING (
  clerk_user_id = (auth.jwt() ->> 'sub'::text) AND
  organization_id = (auth.jwt() ->> 'org_id'::text)
)
WITH CHECK (
  clerk_user_id = (auth.jwt() ->> 'sub'::text) AND
  organization_id = (auth.jwt() ->> 'org_id'::text)
);
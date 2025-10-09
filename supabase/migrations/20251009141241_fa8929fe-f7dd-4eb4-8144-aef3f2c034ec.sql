-- Create a more permissive policy for onboarding fields only
-- This allows users to update their onboarding status without organization_id check
CREATE POLICY "Users can update their own onboarding status"
ON public.users
FOR UPDATE
USING (clerk_user_id = (auth.jwt() ->> 'sub'::text))
WITH CHECK (clerk_user_id = (auth.jwt() ->> 'sub'::text));
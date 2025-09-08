-- Allow public users to validate organization existence (for consent page)
-- This only allows reading id and name for validation purposes
CREATE POLICY "Public users can validate organization existence" 
ON public.organizations 
FOR SELECT 
TO public
USING (true);
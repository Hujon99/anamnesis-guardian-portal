-- Allow system admins to view all anamnes_entries from all organizations
CREATE POLICY "System admins can view all entries" 
ON public.anamnes_entries 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1
    FROM public.organizations
    WHERE organizations.id = (auth.jwt() ->> 'org_id')
    AND organizations.is_system_org = true
  )
);
-- Add RLS policies for updating form titles by organization members
CREATE POLICY "Organization members can update forms" 
ON public.anamnes_forms 
FOR UPDATE 
USING (organization_id = (auth.jwt() ->> 'org_id'::text))
WITH CHECK (organization_id = (auth.jwt() ->> 'org_id'::text));
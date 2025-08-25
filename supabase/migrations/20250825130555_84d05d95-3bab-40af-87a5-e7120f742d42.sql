-- Remove anonymous access to patient data
-- This is a critical security fix to prevent unauthorized access to sensitive medical information

-- Drop the anonymous token verification policy that allows public access to patient data
DROP POLICY IF EXISTS "Allow anonymous token verification" ON public.anamnes_entries;

-- Enable RLS on tables that are missing it
ALTER TABLE public.auto_deletion_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- Add restrictive policies for auto_deletion_logs (admin/service only)
CREATE POLICY "Service role can view auto deletion logs" 
ON public.auto_deletion_logs 
FOR SELECT 
USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can insert auto deletion logs" 
ON public.auto_deletion_logs 
FOR INSERT 
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Add restrictive policies for organization_settings (organization members only)
CREATE POLICY "Organization members can view settings" 
ON public.organization_settings 
FOR SELECT 
USING ((auth.jwt() ->> 'org_id') = organization_id);

CREATE POLICY "Organization members can update settings" 
ON public.organization_settings 
FOR UPDATE 
USING ((auth.jwt() ->> 'org_id') = organization_id);

CREATE POLICY "Organization members can insert settings" 
ON public.organization_settings 
FOR INSERT 
WITH CHECK ((auth.jwt() ->> 'org_id') = organization_id);
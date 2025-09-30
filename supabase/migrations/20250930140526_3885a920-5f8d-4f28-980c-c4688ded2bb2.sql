-- Add is_system_org flag to organizations table
ALTER TABLE public.organizations 
ADD COLUMN is_system_org BOOLEAN DEFAULT false;

-- Create an index for faster lookups
CREATE INDEX idx_organizations_is_system_org ON public.organizations(is_system_org) WHERE is_system_org = true;

-- Add comment
COMMENT ON COLUMN public.organizations.is_system_org IS 'Marks an organization as having system administrator privileges for managing global settings';

-- Update RLS policies for organization_settings to use the new flag
DROP POLICY IF EXISTS "System admins can insert system settings" ON public.organization_settings;
DROP POLICY IF EXISTS "System admins can update system settings" ON public.organization_settings;

-- Allow members of system org to insert settings for 'system' organization_id
CREATE POLICY "System org members can insert system settings"
ON public.organization_settings
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = 'system' 
  AND EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = (auth.jwt() ->> 'org_id') 
    AND is_system_org = true
  )
);

-- Allow members of system org to update settings for 'system' organization_id
CREATE POLICY "System org members can update system settings"
ON public.organization_settings
FOR UPDATE
TO authenticated
USING (
  organization_id = 'system' 
  AND EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = (auth.jwt() ->> 'org_id') 
    AND is_system_org = true
  )
);

-- Allow members of system org to view system settings
CREATE POLICY "System org members can view system settings"
ON public.organization_settings
FOR SELECT
TO authenticated
USING (
  organization_id = 'system' 
  AND EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = (auth.jwt() ->> 'org_id') 
    AND is_system_org = true
  )
);
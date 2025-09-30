-- Update RLS policies for organization_settings to use is_global_default flag
-- This fixes the issue where system admins couldn't save global prompts

-- Drop old system settings policies
DROP POLICY IF EXISTS "System org members can insert system settings" ON organization_settings;
DROP POLICY IF EXISTS "System org members can update system settings" ON organization_settings;
DROP POLICY IF EXISTS "System org members can view system settings" ON organization_settings;

-- Create new policies using is_global_default flag
CREATE POLICY "System org members can insert system settings"
ON organization_settings
FOR INSERT
TO authenticated
WITH CHECK (
  is_global_default = true 
  AND EXISTS (
    SELECT 1 FROM organizations 
    WHERE organizations.id = (auth.jwt() ->> 'org_id')
    AND organizations.is_system_org = true
  )
);

CREATE POLICY "System org members can update system settings"
ON organization_settings
FOR UPDATE
TO authenticated
USING (
  is_global_default = true 
  AND EXISTS (
    SELECT 1 FROM organizations 
    WHERE organizations.id = (auth.jwt() ->> 'org_id')
    AND organizations.is_system_org = true
  )
);

CREATE POLICY "System org members can view system settings"
ON organization_settings
FOR SELECT
TO authenticated
USING (
  is_global_default = true 
  AND EXISTS (
    SELECT 1 FROM organizations 
    WHERE organizations.id = (auth.jwt() ->> 'org_id')
    AND organizations.is_system_org = true
  )
);
-- Fix RLS policies for organization_settings to work without JWT org_id

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Organization members can update settings" ON organization_settings;
DROP POLICY IF EXISTS "System org members can update system settings" ON organization_settings;

-- Create new UPDATE policy for regular organization members
CREATE POLICY "Organization members can update settings"
ON organization_settings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.clerk_user_id = (auth.jwt() ->> 'sub')
    AND users.organization_id = organization_settings.organization_id
  )
);

-- Create new UPDATE policy for system organization members (global defaults)
CREATE POLICY "System org members can update system settings"
ON organization_settings
FOR UPDATE
USING (
  organization_settings.is_global_default = true
  AND EXISTS (
    SELECT 1 FROM users
    JOIN organizations ON organizations.id = users.organization_id
    WHERE users.clerk_user_id = (auth.jwt() ->> 'sub')
    AND organizations.is_system_org = true
  )
);

-- Also fix INSERT policies while we're at it
DROP POLICY IF EXISTS "Organization members can insert settings" ON organization_settings;
DROP POLICY IF EXISTS "System org members can insert system settings" ON organization_settings;

CREATE POLICY "Organization members can insert settings"
ON organization_settings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.clerk_user_id = (auth.jwt() ->> 'sub')
    AND users.organization_id = organization_settings.organization_id
  )
);

CREATE POLICY "System org members can insert system settings"
ON organization_settings
FOR INSERT
WITH CHECK (
  organization_settings.is_global_default = true
  AND EXISTS (
    SELECT 1 FROM users
    JOIN organizations ON organizations.id = users.organization_id
    WHERE users.clerk_user_id = (auth.jwt() ->> 'sub')
    AND organizations.is_system_org = true
  )
);
-- Update the system organization_settings row to use the actual system admin org ID
-- This fixes the issue where global system prompts couldn't be saved due to RLS policy mismatch

UPDATE organization_settings
SET organization_id = 'org_33QElIQOeFBE1ldYWU3qbJPYPWs'
WHERE organization_id = 'system' AND is_global_default = true;
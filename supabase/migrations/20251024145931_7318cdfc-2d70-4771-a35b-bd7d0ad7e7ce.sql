-- Fix RLS policy for kiosk_sessions to work with Clerk authentication
-- Drop existing policies
DROP POLICY IF EXISTS "Organization members can create kiosk sessions" ON kiosk_sessions;
DROP POLICY IF EXISTS "Organization members can delete kiosk sessions" ON kiosk_sessions;
DROP POLICY IF EXISTS "Organization members can update kiosk sessions" ON kiosk_sessions;
DROP POLICY IF EXISTS "Organization members can view kiosk sessions" ON kiosk_sessions;
DROP POLICY IF EXISTS "Public can read active kiosk sessions via token" ON kiosk_sessions;

-- Create new policies that match the pattern used in other tables
CREATE POLICY "Organization members can create kiosk sessions" 
ON kiosk_sessions 
FOR INSERT 
WITH CHECK (
  organization_id = (auth.jwt() ->> 'org_id'::text)
);

CREATE POLICY "Organization members can delete kiosk sessions" 
ON kiosk_sessions 
FOR DELETE 
USING (
  organization_id = (auth.jwt() ->> 'org_id'::text)
);

CREATE POLICY "Organization members can update kiosk sessions" 
ON kiosk_sessions 
FOR UPDATE 
USING (
  organization_id = (auth.jwt() ->> 'org_id'::text)
);

CREATE POLICY "Organization members can view kiosk sessions" 
ON kiosk_sessions 
FOR SELECT 
USING (
  organization_id = (auth.jwt() ->> 'org_id'::text)
);

CREATE POLICY "Public can read active kiosk sessions via token" 
ON kiosk_sessions 
FOR SELECT 
USING (
  is_active = true AND persistent_token IS NOT NULL
);
-- Fix kiosk_sessions RLS to use the same pattern as other working tables
-- Step 1: Drop all existing policies first
DROP POLICY IF EXISTS "Organization members can create kiosk sessions" ON kiosk_sessions;
DROP POLICY IF EXISTS "Organization members can delete kiosk sessions" ON kiosk_sessions;
DROP POLICY IF EXISTS "Organization members can update kiosk sessions" ON kiosk_sessions;
DROP POLICY IF EXISTS "Organization members can view kiosk sessions" ON kiosk_sessions;
DROP POLICY IF EXISTS "Public can read active kiosk sessions via token" ON kiosk_sessions;

-- Step 2: Now drop the security definer function
DROP FUNCTION IF EXISTS public.is_organization_member(text, text);

-- Step 3: Create policies using the same pattern as anamnes_entries (which works)
CREATE POLICY "Organization members can insert kiosk sessions"
ON kiosk_sessions
FOR INSERT
WITH CHECK (
  ((auth.jwt() ->> 'org_id'::text) = organization_id)
);

CREATE POLICY "Organization members can update kiosk sessions"
ON kiosk_sessions
FOR UPDATE
USING (
  ((auth.jwt() ->> 'org_id'::text) = organization_id)
);

CREATE POLICY "Organization members can delete kiosk sessions"
ON kiosk_sessions
FOR DELETE
USING (
  ((auth.jwt() ->> 'org_id'::text) = organization_id)
);

CREATE POLICY "Organization members can select kiosk sessions"
ON kiosk_sessions
FOR SELECT
USING (
  ((auth.jwt() ->> 'org_id'::text) = organization_id)
);

CREATE POLICY "Public can read active kiosk sessions via token"
ON kiosk_sessions
FOR SELECT
USING (
  is_active = true AND persistent_token IS NOT NULL
);
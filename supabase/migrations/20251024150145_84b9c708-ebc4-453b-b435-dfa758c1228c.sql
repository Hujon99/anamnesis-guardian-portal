-- Create security definer function to check organization membership
-- This avoids JWT parsing issues and works reliably with Clerk
CREATE OR REPLACE FUNCTION public.is_organization_member(user_id_param text, org_id_param text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users
    WHERE clerk_user_id = user_id_param
    AND organization_id = org_id_param
  );
$$;

-- Drop existing RLS policies on kiosk_sessions
DROP POLICY IF EXISTS "Organization members can create kiosk sessions" ON kiosk_sessions;
DROP POLICY IF EXISTS "Organization members can delete kiosk sessions" ON kiosk_sessions;
DROP POLICY IF EXISTS "Organization members can update kiosk sessions" ON kiosk_sessions;
DROP POLICY IF EXISTS "Organization members can view kiosk sessions" ON kiosk_sessions;
DROP POLICY IF EXISTS "Public can read active kiosk sessions via token" ON kiosk_sessions;

-- Create new RLS policies using the security definer function
CREATE POLICY "Organization members can create kiosk sessions" 
ON kiosk_sessions 
FOR INSERT 
WITH CHECK (
  public.is_organization_member((auth.jwt() ->> 'sub'::text), organization_id)
);

CREATE POLICY "Organization members can delete kiosk sessions" 
ON kiosk_sessions 
FOR DELETE 
USING (
  public.is_organization_member((auth.jwt() ->> 'sub'::text), organization_id)
);

CREATE POLICY "Organization members can update kiosk sessions" 
ON kiosk_sessions 
FOR UPDATE 
USING (
  public.is_organization_member((auth.jwt() ->> 'sub'::text), organization_id)
);

CREATE POLICY "Organization members can view kiosk sessions" 
ON kiosk_sessions 
FOR SELECT 
USING (
  public.is_organization_member((auth.jwt() ->> 'sub'::text), organization_id)
);

CREATE POLICY "Public can read active kiosk sessions via token" 
ON kiosk_sessions 
FOR SELECT 
USING (
  is_active = true AND persistent_token IS NOT NULL
);
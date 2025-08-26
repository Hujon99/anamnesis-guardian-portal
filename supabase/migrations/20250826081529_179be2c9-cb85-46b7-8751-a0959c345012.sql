-- Create audit_auth_logs table for tracking authentication events
CREATE TABLE public.audit_auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('login', 'logout', 'session_created', 'session_ended')),
  user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  clerk_user_id TEXT,
  email TEXT,
  ip_address_anonymized TEXT, -- Store only first 3 octets for privacy
  user_agent TEXT,
  session_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for performance
CREATE INDEX idx_audit_auth_logs_user_org ON public.audit_auth_logs(user_id, organization_id);
CREATE INDEX idx_audit_auth_logs_created_at ON public.audit_auth_logs(created_at);
CREATE INDEX idx_audit_auth_logs_event_type ON public.audit_auth_logs(event_type);

-- Enable RLS
ALTER TABLE public.audit_auth_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can view all auth logs
CREATE POLICY "Service role can view all auth logs"
ON public.audit_auth_logs
FOR SELECT
USING (auth.jwt() ->> 'role' = 'service_role');

-- Policy: Organization admins can view their org's auth logs
CREATE POLICY "Organization admins can view auth logs"
ON public.audit_auth_logs
FOR SELECT
USING (
  organization_id = (auth.jwt() ->> 'org_id') AND
  (auth.jwt() ->> 'org_role') = 'org:admin'
);

-- Policy: Service role can insert auth logs (for webhook)
CREATE POLICY "Service role can insert auth logs"
ON public.audit_auth_logs
FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Add comment
COMMENT ON TABLE public.audit_auth_logs IS 'GDPR-compliant authentication event logs with IP anonymization and 12-month retention';
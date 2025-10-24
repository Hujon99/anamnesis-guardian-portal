-- Create kiosk_sessions table for reusable kiosk mode
CREATE TABLE IF NOT EXISTS public.kiosk_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  store_id UUID REFERENCES public.stores(id),
  form_id UUID NOT NULL REFERENCES public.anamnes_forms(id),
  
  -- Reusable token that stays the same
  persistent_token TEXT UNIQUE NOT NULL,
  
  -- Settings
  require_supervisor_code BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Statistics
  total_submissions INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  
  -- Optional expiration (null = no expiration)
  expires_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.kiosk_sessions ENABLE ROW LEVEL SECURITY;

-- Organization members can view their kiosk sessions
CREATE POLICY "Organization members can view kiosk sessions"
ON public.kiosk_sessions
FOR SELECT
USING (organization_id = (auth.jwt() ->> 'org_id'));

-- Organization members can create kiosk sessions
CREATE POLICY "Organization members can create kiosk sessions"
ON public.kiosk_sessions
FOR INSERT
WITH CHECK (organization_id = (auth.jwt() ->> 'org_id'));

-- Organization members can update their kiosk sessions
CREATE POLICY "Organization members can update kiosk sessions"
ON public.kiosk_sessions
FOR UPDATE
USING (organization_id = (auth.jwt() ->> 'org_id'));

-- Organization members can delete their kiosk sessions
CREATE POLICY "Organization members can delete kiosk sessions"
ON public.kiosk_sessions
FOR DELETE
USING (organization_id = (auth.jwt() ->> 'org_id'));

-- Public users can read active sessions via token (for validation)
CREATE POLICY "Public can read active kiosk sessions via token"
ON public.kiosk_sessions
FOR SELECT
USING (is_active = true AND persistent_token IS NOT NULL);

-- Create index for faster token lookups
CREATE INDEX idx_kiosk_sessions_persistent_token ON public.kiosk_sessions(persistent_token);
CREATE INDEX idx_kiosk_sessions_organization_id ON public.kiosk_sessions(organization_id);

-- Add comment
COMMENT ON TABLE public.kiosk_sessions IS 'Reusable kiosk sessions for continuous patient form filling';
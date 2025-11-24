-- Create api_keys table for external system integration
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  api_secret_hash TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '["read", "write"]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  environment TEXT DEFAULT 'production' CHECK (environment IN ('production', 'sandbox')),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_api_keys_organization ON public.api_keys(organization_id);
CREATE INDEX idx_api_keys_key ON public.api_keys(api_key) WHERE is_active = true;
CREATE INDEX idx_api_keys_environment ON public.api_keys(environment);

-- Comments
COMMENT ON TABLE public.api_keys IS 'API keys for external system integration (e.g., ServeIT)';
COMMENT ON COLUMN public.api_keys.api_key IS 'Public API key (format: anp_live_xxx or anp_test_xxx)';
COMMENT ON COLUMN public.api_keys.api_secret_hash IS 'Bcrypt hashed secret, only shown once at creation';
COMMENT ON COLUMN public.api_keys.permissions IS 'Array of permissions: ["read", "write"]';
COMMENT ON COLUMN public.api_keys.environment IS 'production or sandbox (test mode)';

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Organization admins can view their API keys
CREATE POLICY "Organization admins can view api keys"
ON public.api_keys
FOR SELECT
TO authenticated
USING (
  organization_id = (auth.jwt() ->> 'org_id') 
  AND (auth.jwt() ->> 'org_role') = 'org:admin'
);

-- Organization admins can create API keys
CREATE POLICY "Organization admins can create api keys"
ON public.api_keys
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = (auth.jwt() ->> 'org_id') 
  AND (auth.jwt() ->> 'org_role') = 'org:admin'
);

-- Organization admins can update their API keys
CREATE POLICY "Organization admins can update api keys"
ON public.api_keys
FOR UPDATE
TO authenticated
USING (
  organization_id = (auth.jwt() ->> 'org_id') 
  AND (auth.jwt() ->> 'org_role') = 'org:admin'
);

-- Organization admins can delete their API keys
CREATE POLICY "Organization admins can delete api keys"
ON public.api_keys
FOR DELETE
TO authenticated
USING (
  organization_id = (auth.jwt() ->> 'org_id') 
  AND (auth.jwt() ->> 'org_role') = 'org:admin'
);

-- Service role can read API keys for validation
CREATE POLICY "Service role can read api keys"
ON public.api_keys
FOR SELECT
USING ((auth.jwt() ->> 'role') = 'service_role');

-- Service role can update last_used_at
CREATE POLICY "Service role can update api key usage"
ON public.api_keys
FOR UPDATE
USING ((auth.jwt() ->> 'role') = 'service_role');

-- Trigger to update updated_at
CREATE TRIGGER update_api_keys_updated_at
BEFORE UPDATE ON public.api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();
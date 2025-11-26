-- Create API request logs table for tracking all API interactions
CREATE TABLE public.api_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Request info
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  
  -- Authentication
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  organization_id TEXT,
  
  -- Request data (sensitive data should be redacted before storing)
  request_params JSONB,
  
  -- Response
  response_status INTEGER NOT NULL,
  response_code TEXT,
  error_message TEXT,
  
  -- Result
  created_entry_id UUID,
  
  -- Metadata
  ip_address_anonymized TEXT,
  user_agent TEXT,
  execution_time_ms INTEGER
);

-- Enable RLS
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

-- Indexes for efficient queries
CREATE INDEX idx_api_request_logs_org_created ON public.api_request_logs(organization_id, created_at DESC);
CREATE INDEX idx_api_request_logs_status_created ON public.api_request_logs(response_status, created_at DESC);
CREATE INDEX idx_api_request_logs_endpoint ON public.api_request_logs(endpoint, created_at DESC);
CREATE INDEX idx_api_request_logs_api_key ON public.api_request_logs(api_key_id, created_at DESC);

-- RLS Policies

-- Organization admins can view their API logs
CREATE POLICY "Organization admins can view api logs"
ON public.api_request_logs
FOR SELECT
USING (
  organization_id = (auth.jwt() ->> 'org_id'::text) 
  AND (auth.jwt() ->> 'org_role'::text) = 'org:admin'
);

-- System admins can view all API logs
CREATE POLICY "System admins can view all api logs"
ON public.api_request_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organizations
    WHERE organizations.id = (auth.jwt() ->> 'org_id'::text)
    AND organizations.is_system_org = true
  )
);

-- Service role can insert logs (used by edge functions)
CREATE POLICY "Service role can insert api logs"
ON public.api_request_logs
FOR INSERT
WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.api_request_logs IS 'Logs all API requests for auditing and debugging purposes';
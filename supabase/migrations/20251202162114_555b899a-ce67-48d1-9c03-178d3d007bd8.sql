-- Create table for tracking the entire user journey (pre-form pages)
CREATE TABLE public.journey_session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL,
  organization_id TEXT,
  form_id UUID,
  entry_id UUID,
  store_id UUID,
  token TEXT,
  page_type TEXT NOT NULL, -- 'consent', 'customer_info', 'examination_selection', 'form', 'ciss_entry', 'ciss_customer_info'
  event_type TEXT NOT NULL, -- 'page_view', 'page_leave', 'consent_given', 'form_selected', etc.
  event_data JSONB DEFAULT '{}',
  device_type TEXT,
  browser TEXT,
  viewport_width INT,
  viewport_height INT,
  is_touch_device BOOLEAN,
  referrer TEXT,
  url_params JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for common queries
CREATE INDEX idx_journey_logs_journey_id ON journey_session_logs(journey_id);
CREATE INDEX idx_journey_logs_org_id ON journey_session_logs(organization_id);
CREATE INDEX idx_journey_logs_created_at ON journey_session_logs(created_at DESC);
CREATE INDEX idx_journey_logs_page_type ON journey_session_logs(page_type);

-- Enable RLS
ALTER TABLE public.journey_session_logs ENABLE ROW LEVEL SECURITY;

-- Anyone can insert logs (anonymous users before auth)
CREATE POLICY "Anyone can insert journey logs"
ON public.journey_session_logs
FOR INSERT
WITH CHECK (true);

-- Admins can view their org's logs
CREATE POLICY "Admins can view org journey logs"
ON public.journey_session_logs
FOR SELECT
USING (
  (organization_id = (auth.jwt() ->> 'org_id'::text)) 
  AND ((auth.jwt() ->> 'org_role'::text) = 'org:admin'::text)
);

-- System admins can view all logs
CREATE POLICY "System admins can view all journey logs"
ON public.journey_session_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organizations
    WHERE organizations.id = (auth.jwt() ->> 'org_id'::text)
    AND organizations.is_system_org = true
  )
);

-- Add comment
COMMENT ON TABLE public.journey_session_logs IS 'Tracks user journey through consent, customer info, and examination selection pages before reaching the actual form';
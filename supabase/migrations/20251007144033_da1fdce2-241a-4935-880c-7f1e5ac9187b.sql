-- Create form_session_logs table for debugging user journeys
CREATE TABLE public.form_session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  entry_id UUID REFERENCES public.anamnes_entries(id) ON DELETE CASCADE,
  token TEXT,
  organization_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  
  -- Context
  current_section_index INT,
  current_question_id TEXT,
  form_progress_percent INT,
  
  -- Device/Browser info
  device_type TEXT,
  browser TEXT,
  viewport_width INT,
  viewport_height INT,
  is_touch_device BOOLEAN,
  
  -- Error tracking
  error_message TEXT,
  error_type TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX idx_form_session_logs_session_id ON public.form_session_logs(session_id);
CREATE INDEX idx_form_session_logs_entry_id ON public.form_session_logs(entry_id);
CREATE INDEX idx_form_session_logs_org_event ON public.form_session_logs(organization_id, event_type, created_at DESC);

-- Enable RLS
ALTER TABLE public.form_session_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view their org's logs
CREATE POLICY "Admins can view org logs"
ON public.form_session_logs 
FOR SELECT
TO authenticated
USING (
  organization_id = (auth.jwt() ->> 'org_id') 
  AND (auth.jwt() ->> 'org_role') = 'org:admin'
);

-- System admins can view all logs
CREATE POLICY "System admins can view all logs"
ON public.form_session_logs 
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = (auth.jwt() ->> 'org_id') 
    AND is_system_org = true
  )
);

-- Public insert (from forms without auth)
CREATE POLICY "Anyone can insert logs"
ON public.form_session_logs 
FOR INSERT
WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE public.form_session_logs IS 'Tracks user form sessions for debugging and analysis';
-- Create table for tracking form attempt reports
CREATE TABLE IF NOT EXISTS public.form_attempt_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations
  organization_id TEXT NOT NULL REFERENCES public.organizations(id),
  store_id UUID REFERENCES public.stores(id),
  entry_id UUID NOT NULL REFERENCES public.anamnes_entries(id) ON DELETE CASCADE,
  
  -- Core data
  customer_attempted_online BOOLEAN NOT NULL,
  failure_description TEXT,
  
  -- Metadata
  reported_by TEXT NOT NULL,
  reported_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_report_per_entry UNIQUE(entry_id)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_attempt_reports_org ON public.form_attempt_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_attempt_reports_store ON public.form_attempt_reports(store_id);
CREATE INDEX IF NOT EXISTS idx_attempt_reports_created ON public.form_attempt_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_attempt_reports_attempted ON public.form_attempt_reports(customer_attempted_online);

-- Enable RLS
ALTER TABLE public.form_attempt_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Organization members can view their reports
CREATE POLICY "Users can view org reports"
ON public.form_attempt_reports 
FOR SELECT
TO authenticated
USING (organization_id = (auth.jwt() ->> 'org_id'));

-- System admins can view all reports
CREATE POLICY "System admins can view all reports"
ON public.form_attempt_reports 
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = (auth.jwt() ->> 'org_id')
    AND is_system_org = true
  )
);

-- Opticians can insert reports for their org
CREATE POLICY "Opticians can insert reports"
ON public.form_attempt_reports 
FOR INSERT
TO authenticated
WITH CHECK (organization_id = (auth.jwt() ->> 'org_id'));

-- Comment on table
COMMENT ON TABLE public.form_attempt_reports IS 'Tracks customer reports of failed form submission attempts for debugging and analytics';
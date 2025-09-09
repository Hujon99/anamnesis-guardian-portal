-- Create table for GDPR information confirmations in store
CREATE TABLE public.gdpr_store_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.anamnes_entries(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL,
  confirmed_by TEXT NOT NULL, -- User ID who confirmed
  confirmed_by_name TEXT NOT NULL, -- Display name of user who confirmed
  confirmed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  info_type TEXT NOT NULL CHECK (info_type IN ('full', 'short')), -- Which info text was used
  notes TEXT, -- Optional notes field
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gdpr_store_confirmations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Organization members can view GDPR confirmations"
  ON public.gdpr_store_confirmations
  FOR SELECT
  USING (organization_id = (auth.jwt() ->> 'org_id'));

CREATE POLICY "Organization members can insert GDPR confirmations"
  ON public.gdpr_store_confirmations
  FOR INSERT
  WITH CHECK (organization_id = (auth.jwt() ->> 'org_id'));

-- Create index for better performance
CREATE INDEX idx_gdpr_confirmations_entry_id ON public.gdpr_store_confirmations(entry_id);
CREATE INDEX idx_gdpr_confirmations_organization ON public.gdpr_store_confirmations(organization_id);
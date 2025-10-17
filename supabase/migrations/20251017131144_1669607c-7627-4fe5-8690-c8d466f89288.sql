-- Create table for tracking upgrade conversions anonymously
CREATE TABLE IF NOT EXISTS upgrade_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES anamnes_entries(id) ON DELETE CASCADE,
  
  -- Upgrade information
  upgrade_question_id TEXT NOT NULL,
  upgrade_accepted BOOLEAN NOT NULL,
  
  -- Metadata for analysis (anonymized)
  examination_type TEXT,
  form_id UUID REFERENCES anamnes_forms(id) ON DELETE SET NULL,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique tracking per entry and question
  CONSTRAINT unique_entry_upgrade UNIQUE(entry_id, upgrade_question_id)
);

-- Create indexes for fast queries
CREATE INDEX idx_upgrade_conversions_org ON upgrade_conversions(organization_id);
CREATE INDEX idx_upgrade_conversions_accepted ON upgrade_conversions(upgrade_accepted);
CREATE INDEX idx_upgrade_conversions_created ON upgrade_conversions(created_at);
CREATE INDEX idx_upgrade_conversions_store ON upgrade_conversions(store_id);

-- Enable RLS
ALTER TABLE upgrade_conversions ENABLE ROW LEVEL SECURITY;

-- Organizations can view their own conversions
CREATE POLICY "Organizations can view their conversions"
  ON upgrade_conversions FOR SELECT
  USING (organization_id = (auth.jwt() ->> 'org_id'));

-- System organization can view all conversions (for provider statistics)
CREATE POLICY "System org can view all conversions"
  ON upgrade_conversions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE id = (auth.jwt() ->> 'org_id')
      AND is_system_org = true
    )
  );

-- Service role can insert conversions via edge function
CREATE POLICY "Service role can insert conversions"
  ON upgrade_conversions FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- Comment on table
COMMENT ON TABLE upgrade_conversions IS 'Anonymized tracking of upgrade question conversions for business analytics';
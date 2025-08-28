
-- 1) Add redaction tracking columns
ALTER TABLE public.anamnes_entries
  ADD COLUMN IF NOT EXISTS is_redacted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS redacted_at timestamptz;

COMMENT ON COLUMN public.anamnes_entries.is_redacted IS 'True when medical content has been redacted (answers, formatted, ai_summary, internal_notes cleared)';
COMMENT ON COLUMN public.anamnes_entries.redacted_at IS 'Timestamp when redaction occurred';

-- 2) Create auto_redaction_logs table (separate from auto_deletion_logs)
CREATE TABLE IF NOT EXISTS public.auto_redaction_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz DEFAULT now(),
  entries_redacted integer,
  organizations_affected text[],
  error text
);

-- Enable RLS
ALTER TABLE public.auto_redaction_logs ENABLE ROW LEVEL SECURITY;

-- Policies: service role can insert and read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'auto_redaction_logs' 
      AND policyname = 'Service role can view auto redaction logs'
  ) THEN
    CREATE POLICY "Service role can view auto redaction logs"
      ON public.auto_redaction_logs
      FOR SELECT
      USING ((auth.jwt() ->> 'role') = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'auto_redaction_logs' 
      AND policyname = 'Service role can insert auto redaction logs'
  ) THEN
    CREATE POLICY "Service role can insert auto redaction logs"
      ON public.auto_redaction_logs
      FOR INSERT
      WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
  END IF;
END $$;

-- 3) Helpful index for the redaction job
-- Redact entries that are journaled/ready/reviewed, due, and not yet redacted
CREATE INDEX IF NOT EXISTS idx_anamnes_redaction_due
  ON public.anamnes_entries (auto_deletion_timestamp)
  WHERE status IN ('journaled', 'ready', 'reviewed') AND is_redacted = false;


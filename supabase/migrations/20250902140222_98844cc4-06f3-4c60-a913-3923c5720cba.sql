-- Add partial index to optimize cleanup of non-magic, redacted, journaled/reviewed entries with past booking_date
CREATE INDEX IF NOT EXISTS idx_anamnes_entries_journaled_non_magic_cleanup
ON public.anamnes_entries (booking_date)
WHERE (
  is_magic_link = false
  AND is_redacted = true
  AND status IN ('journaled','reviewed')
  AND booking_date IS NOT NULL
);

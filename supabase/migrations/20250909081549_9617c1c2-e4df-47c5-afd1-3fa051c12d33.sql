-- Backfill ID verification data from driving_license_examinations to anamnes_entries
-- Purpose: Ensure overview badges and lists reflect correct ID status by storing it in anamnes_entries
-- Idempotent: Only updates rows where anamnes_entries is missing or not marked as verified

BEGIN;

-- 1) Copy verification data for entries where examinations show verified but entry is not
UPDATE public.anamnes_entries e
SET 
  id_verification_completed = TRUE,
  id_type = COALESCE(e.id_type, dle.id_type),
  personal_number = COALESCE(e.personal_number, dle.personal_number),
  verified_by = COALESCE(e.verified_by, dle.verified_by),
  verified_at = COALESCE(e.verified_at, dle.verified_at),
  -- If entry was deferred, make it ready now that verification exists
  status = CASE WHEN e.status = 'pending_id_verification' THEN 'ready' ELSE e.status END,
  updated_at = NOW()
FROM public.driving_license_examinations dle
WHERE dle.entry_id = e.id
  AND dle.id_verification_completed = TRUE
  AND (
    e.id_verification_completed IS DISTINCT FROM TRUE
    OR e.id_type IS NULL
    OR e.personal_number IS NULL
    OR e.verified_by IS NULL
    OR e.verified_at IS NULL
  );

COMMIT;
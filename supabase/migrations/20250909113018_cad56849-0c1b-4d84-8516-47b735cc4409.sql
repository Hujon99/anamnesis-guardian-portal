-- Consolidate GDPR confirmations into anamnes_entries and remove legacy table
BEGIN;

-- 1) Add unified GDPR columns to anamnes_entries (idempotent)
ALTER TABLE public.anamnes_entries ADD COLUMN IF NOT EXISTS gdpr_method text; -- 'online_consent' | 'store_verbal'
ALTER TABLE public.anamnes_entries ADD COLUMN IF NOT EXISTS gdpr_confirmed_by text; -- user id
ALTER TABLE public.anamnes_entries ADD COLUMN IF NOT EXISTS gdpr_confirmed_by_name text; -- display name
ALTER TABLE public.anamnes_entries ADD COLUMN IF NOT EXISTS gdpr_info_type text; -- 'full' | 'short'
ALTER TABLE public.anamnes_entries ADD COLUMN IF NOT EXISTS gdpr_notes text; -- optional notes

COMMENT ON COLUMN public.anamnes_entries.gdpr_method IS 'How GDPR was confirmed: online_consent or store_verbal';
COMMENT ON COLUMN public.anamnes_entries.gdpr_confirmed_by IS 'User id who confirmed GDPR in store';
COMMENT ON COLUMN public.anamnes_entries.gdpr_confirmed_by_name IS 'Display name of confirmer';
COMMENT ON COLUMN public.anamnes_entries.gdpr_info_type IS 'full or short text used during store verbal information';
COMMENT ON COLUMN public.anamnes_entries.gdpr_notes IS 'Optional notes for GDPR confirmation';

-- 2) Backfill data from gdpr_store_confirmations if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'gdpr_store_confirmations'
  ) THEN
    UPDATE public.anamnes_entries e
    SET
      gdpr_method = 'store_verbal',
      gdpr_confirmed_by = g.confirmed_by,
      gdpr_confirmed_by_name = g.confirmed_by_name,
      consent_given = true,
      consent_timestamp = COALESCE(e.consent_timestamp, g.confirmed_at),
      gdpr_info_type = g.info_type,
      gdpr_notes = g.notes
    FROM public.gdpr_store_confirmations g
    WHERE e.id = g.entry_id
      AND (
        e.gdpr_method IS DISTINCT FROM 'store_verbal' OR
        e.gdpr_confirmed_by IS DISTINCT FROM g.confirmed_by OR
        e.gdpr_confirmed_by_name IS DISTINCT FROM g.confirmed_by_name OR
        e.gdpr_info_type IS DISTINCT FROM g.info_type OR
        e.gdpr_notes IS DISTINCT FROM g.notes OR
        e.consent_given IS DISTINCT FROM true OR
        e.consent_timestamp IS DISTINCT FROM g.confirmed_at
      );
  END IF;
END $$;

-- 3) Drop legacy table now that data is consolidated (safe if it does not exist)
DROP TABLE IF EXISTS public.gdpr_store_confirmations CASCADE;

COMMIT;
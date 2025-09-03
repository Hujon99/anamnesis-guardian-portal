-- 1) Remove duplicate examinations per entry_id, keep the newest
WITH ranked AS (
  SELECT id, entry_id,
         ROW_NUMBER() OVER (PARTITION BY entry_id ORDER BY updated_at DESC, created_at DESC, id DESC) AS rn
  FROM public.driving_license_examinations
)
DELETE FROM public.driving_license_examinations d
USING ranked r
WHERE d.id = r.id AND r.rn > 1;

-- 2) Add unique constraint on entry_id (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'driving_license_examinations_entry_id_unique'
  ) THEN
    ALTER TABLE public.driving_license_examinations 
    ADD CONSTRAINT driving_license_examinations_entry_id_unique UNIQUE (entry_id);
  END IF;
END $$;
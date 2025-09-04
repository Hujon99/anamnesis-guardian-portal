-- Add glasses prescription columns for higher license examinations
-- Purpose: Persist SF/CYL/AX/ADD per eye when correction is used
-- Table: public.driving_license_examinations

ALTER TABLE public.driving_license_examinations
ADD COLUMN IF NOT EXISTS glasses_prescription_od_sph NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS glasses_prescription_od_cyl NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS glasses_prescription_od_axis SMALLINT,
ADD COLUMN IF NOT EXISTS glasses_prescription_od_add NUMERIC(4,2),
ADD COLUMN IF NOT EXISTS glasses_prescription_os_sph NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS glasses_prescription_os_cyl NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS glasses_prescription_os_axis SMALLINT,
ADD COLUMN IF NOT EXISTS glasses_prescription_os_add NUMERIC(4,2);

-- Add constraints if they don't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_od_axis_range'
  ) THEN
    ALTER TABLE public.driving_license_examinations
    ADD CONSTRAINT chk_od_axis_range CHECK (
      glasses_prescription_od_axis IS NULL OR glasses_prescription_od_axis BETWEEN 0 AND 180
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_os_axis_range'
  ) THEN
    ALTER TABLE public.driving_license_examinations
    ADD CONSTRAINT chk_os_axis_range CHECK (
      glasses_prescription_os_axis IS NULL OR glasses_prescription_os_axis BETWEEN 0 AND 180
    );
  END IF;
END $$;

-- RLS already covers this table; no policy changes required.
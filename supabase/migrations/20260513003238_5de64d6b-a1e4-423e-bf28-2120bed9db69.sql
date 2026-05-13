ALTER TABLE public.driving_license_examinations
ADD COLUMN IF NOT EXISTS prescription_over_8d boolean NOT NULL DEFAULT false;
ALTER TABLE public.driving_license_examinations
  ADD COLUMN IF NOT EXISTS completion_method text NOT NULL DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS servit_customer_number text;

ALTER TABLE public.driving_license_examinations
  DROP CONSTRAINT IF EXISTS driving_license_examinations_completion_method_check;

ALTER TABLE public.driving_license_examinations
  ADD CONSTRAINT driving_license_examinations_completion_method_check
  CHECK (completion_method IN ('app', 'servit'));
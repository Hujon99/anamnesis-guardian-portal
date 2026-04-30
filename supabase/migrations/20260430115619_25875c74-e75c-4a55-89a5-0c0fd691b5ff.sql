-- 1) Drop the old FK that depends on the global unique index
ALTER TABLE public.anamnes_entries
  DROP CONSTRAINT IF EXISTS anamnes_entries_optician_id_fkey;

-- 2) Now safe to drop the global UNIQUE on users.clerk_user_id
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_clerk_user_id_key;

-- 3) Add new composite FK: matches optician within the correct organization
ALTER TABLE public.anamnes_entries
  ADD CONSTRAINT anamnes_entries_optician_org_fkey
  FOREIGN KEY (organization_id, optician_id)
  REFERENCES public.users (organization_id, clerk_user_id)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

-- 4) Add Daniel as optician in Niemis Optik Norrland (idempotent)
INSERT INTO public.users (
  clerk_user_id, organization_id, role, email, first_name, last_name, display_name
)
VALUES (
  'user_2vQClyKFlPm7QBb1U0Z6P5wD5VN',
  'org_2vXhzuO3NxisIjVL4PoGRK7ZdxF',
  'optician',
  'daniel@binokel.se',
  'Daniel',
  'Niemi',
  'Daniel Niemi'
)
ON CONFLICT (organization_id, clerk_user_id) DO NOTHING;
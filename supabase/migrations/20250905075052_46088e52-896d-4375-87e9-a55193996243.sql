-- Add ID verification columns to anamnes_entries
ALTER TABLE public.anamnes_entries 
ADD COLUMN IF NOT EXISTS id_verification_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS id_type id_verification_type,
ADD COLUMN IF NOT EXISTS personal_number text,
ADD COLUMN IF NOT EXISTS verified_by text,
ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone;

-- Add comment to explain the new fields
COMMENT ON COLUMN public.anamnes_entries.id_verification_completed IS 'Indicates if ID verification has been completed for this entry';
COMMENT ON COLUMN public.anamnes_entries.id_type IS 'Type of ID document used for verification';
COMMENT ON COLUMN public.anamnes_entries.personal_number IS 'Personal number from ID verification';
COMMENT ON COLUMN public.anamnes_entries.verified_by IS 'User ID of person who performed verification';
COMMENT ON COLUMN public.anamnes_entries.verified_at IS 'Timestamp when verification was completed';
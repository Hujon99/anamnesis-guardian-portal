-- Fix visual acuity precision by changing from numeric(3,1) to numeric(3,2)
-- This allows storing values like 1.25 instead of rounding to 1.3

ALTER TABLE public.driving_license_examinations 
ALTER COLUMN visual_acuity_both_eyes TYPE numeric(3,2),
ALTER COLUMN visual_acuity_right_eye TYPE numeric(3,2),
ALTER COLUMN visual_acuity_left_eye TYPE numeric(3,2),
ALTER COLUMN visual_acuity_with_correction_both TYPE numeric(3,2),
ALTER COLUMN visual_acuity_with_correction_right TYPE numeric(3,2),
ALTER COLUMN visual_acuity_with_correction_left TYPE numeric(3,2),
ALTER COLUMN visual_acuity_with_correction TYPE numeric(3,2);

-- Add comment to document the change
COMMENT ON TABLE public.driving_license_examinations IS 'Driving license examination data with visual acuity values stored with 2 decimal precision for accurate measurements';
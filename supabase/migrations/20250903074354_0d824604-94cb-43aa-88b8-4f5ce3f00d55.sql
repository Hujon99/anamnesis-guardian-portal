-- Add new visual acuity fields for corrected vision measurements
ALTER TABLE public.driving_license_examinations 
ADD COLUMN IF NOT EXISTS visual_acuity_with_correction_both DECIMAL(3,1),
ADD COLUMN IF NOT EXISTS visual_acuity_with_correction_right DECIMAL(3,1), 
ADD COLUMN IF NOT EXISTS visual_acuity_with_correction_left DECIMAL(3,1);

-- Update any existing records that might have the old field name
UPDATE public.driving_license_examinations 
SET visual_acuity_with_correction_both = visual_acuity_with_correction 
WHERE visual_acuity_with_correction IS NOT NULL 
AND visual_acuity_with_correction_both IS NULL;
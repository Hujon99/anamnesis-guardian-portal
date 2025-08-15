-- Add examination_type field to anamnes_forms table
ALTER TABLE public.anamnes_forms 
ADD COLUMN examination_type TEXT DEFAULT 'general';

-- Add index for better performance when filtering by organization and examination type
CREATE INDEX idx_anamnes_forms_org_exam_type ON public.anamnes_forms(organization_id, examination_type);

-- Update existing forms to have a default examination type
UPDATE public.anamnes_forms 
SET examination_type = 'synundersökning' 
WHERE examination_type IS NULL OR examination_type = 'general';
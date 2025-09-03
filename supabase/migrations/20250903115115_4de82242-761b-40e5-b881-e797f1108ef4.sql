-- Add examination_type column to anamnes_entries
ALTER TABLE public.anamnes_entries 
ADD COLUMN examination_type TEXT;

-- Update existing entries with examination_type from their associated forms
UPDATE public.anamnes_entries 
SET examination_type = af.examination_type::TEXT
FROM public.anamnes_forms af 
WHERE public.anamnes_entries.form_id = af.id;

-- Add index for better query performance
CREATE INDEX idx_anamnes_entries_examination_type ON public.anamnes_entries(examination_type);
-- Add foreign key constraint between anamnes_entries and anamnes_forms
ALTER TABLE public.anamnes_entries 
ADD CONSTRAINT fk_anamnes_entries_form_id 
FOREIGN KEY (form_id) 
REFERENCES public.anamnes_forms(id) 
ON DELETE SET NULL;
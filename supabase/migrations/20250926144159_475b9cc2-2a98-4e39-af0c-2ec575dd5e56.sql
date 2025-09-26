-- Add columns for form builder functionality
ALTER TABLE public.anamnes_forms 
ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS template_category text,
ADD COLUMN IF NOT EXISTS created_from_template_id uuid,
ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_modified_by text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_anamnes_forms_template ON public.anamnes_forms(is_template, organization_id);
CREATE INDEX IF NOT EXISTS idx_anamnes_forms_active ON public.anamnes_forms(is_active, organization_id);

-- Update existing default forms to be templates
UPDATE public.anamnes_forms 
SET is_template = true, template_category = 'default'
WHERE organization_id IS NULL;

-- Add RLS policies for form CRUD operations
CREATE POLICY "Organization members can create forms" 
ON public.anamnes_forms 
FOR INSERT 
WITH CHECK (organization_id = (auth.jwt() ->> 'org_id'::text));

CREATE POLICY "Organization members can delete forms" 
ON public.anamnes_forms 
FOR DELETE 
USING (organization_id = (auth.jwt() ->> 'org_id'::text));

-- Add comment for documentation
COMMENT ON COLUMN public.anamnes_forms.is_template IS 'Whether this form serves as a template for creating new forms';
COMMENT ON COLUMN public.anamnes_forms.template_category IS 'Category of template (default, custom, etc.)';
COMMENT ON COLUMN public.anamnes_forms.created_from_template_id IS 'Reference to the template this form was created from';
COMMENT ON COLUMN public.anamnes_forms.version IS 'Version number of the form for tracking changes';
COMMENT ON COLUMN public.anamnes_forms.last_modified_by IS 'User ID of the last person to modify this form';
COMMENT ON COLUMN public.anamnes_forms.is_active IS 'Whether this form is currently active and available for use';
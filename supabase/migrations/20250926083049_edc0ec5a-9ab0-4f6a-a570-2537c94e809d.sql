-- Create store_forms junction table to link stores with available forms
CREATE TABLE public.store_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL,
  form_id UUID NOT NULL,
  organization_id TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT store_forms_store_id_form_id_key UNIQUE(store_id, form_id)
);

-- Add foreign key constraints
ALTER TABLE public.store_forms 
ADD CONSTRAINT store_forms_store_id_fkey 
FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE public.store_forms 
ADD CONSTRAINT store_forms_form_id_fkey 
FOREIGN KEY (form_id) REFERENCES public.anamnes_forms(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE public.store_forms ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for store_forms
CREATE POLICY "Organization members can view store forms" 
ON public.store_forms 
FOR SELECT 
USING (organization_id = (auth.jwt() ->> 'org_id'));

CREATE POLICY "Organization members can insert store forms" 
ON public.store_forms 
FOR INSERT 
WITH CHECK (organization_id = (auth.jwt() ->> 'org_id'));

CREATE POLICY "Organization members can update store forms" 
ON public.store_forms 
FOR UPDATE 
USING (organization_id = (auth.jwt() ->> 'org_id'));

CREATE POLICY "Organization members can delete store forms" 
ON public.store_forms 
FOR DELETE 
USING (organization_id = (auth.jwt() ->> 'org_id'));

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER update_store_forms_updated_at
BEFORE UPDATE ON public.store_forms
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

-- Create indexes for better performance
CREATE INDEX idx_store_forms_store_id ON public.store_forms(store_id);
CREATE INDEX idx_store_forms_form_id ON public.store_forms(form_id);
CREATE INDEX idx_store_forms_organization_id ON public.store_forms(organization_id);
CREATE INDEX idx_store_forms_is_active ON public.store_forms(is_active);

-- Insert default assignments: all existing forms should be available in all stores of the same organization
INSERT INTO public.store_forms (store_id, form_id, organization_id, is_active)
SELECT s.id as store_id, f.id as form_id, s.organization_id, true
FROM public.stores s
CROSS JOIN public.anamnes_forms f
WHERE s.organization_id = f.organization_id
ON CONFLICT (store_id, form_id) DO NOTHING;
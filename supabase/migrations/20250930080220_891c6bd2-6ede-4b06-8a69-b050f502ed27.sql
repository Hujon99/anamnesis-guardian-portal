-- Allow public users to view form templates (needed for examination type selection before authentication)
-- Form templates contain only question structures, no patient data
CREATE POLICY "Public users can view active form templates"
ON public.anamnes_forms
FOR SELECT
TO anon
USING (is_active = true);

-- Allow public users to view store-form assignments (needed to show forms available per store)
-- Store forms table contains only relationships, no sensitive data
CREATE POLICY "Public users can view active store form assignments"
ON public.store_forms
FOR SELECT
TO anon
USING (is_active = true);
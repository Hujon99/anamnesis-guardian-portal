
-- Skapa en security definer funktion för att hämta organization_id från form_id
CREATE OR REPLACE FUNCTION public.get_form_organization_id(form_id_param UUID)
RETURNS TEXT AS $$
  SELECT organization_id FROM public.anamnes_forms WHERE id = form_id_param;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Skapa en funktion för att sätta current_form_id i sessionen
CREATE OR REPLACE FUNCTION public.set_current_form_id(form_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_form_id', form_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Skapa en policy som tillåter anonyma användare att visa butiker för giltiga formulär
CREATE POLICY "Anonymous users can view stores for valid forms" 
ON public.stores 
FOR SELECT 
TO anon 
USING (
  organization_id = public.get_form_organization_id(
    COALESCE(
      nullif(current_setting('app.current_form_id', true), '')::UUID,
      null
    )
  )
);

-- Grant execute permissions på funktionerna (korrigerat)
GRANT EXECUTE ON FUNCTION public.get_form_organization_id(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.set_current_form_id(UUID) TO anon;

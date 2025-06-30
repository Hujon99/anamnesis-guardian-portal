
-- Improve the set_current_form_id function with better error handling and logging
CREATE OR REPLACE FUNCTION public.set_current_form_id(form_id UUID)
RETURNS void AS $$
BEGIN
  -- Set the configuration
  PERFORM set_config('app.current_form_id', form_id::text, false);
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error setting current_form_id: %', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Improve the RLS policy with better null handling (simplified)
DROP POLICY IF EXISTS "Anonymous users can view stores for valid forms" ON public.stores;

CREATE POLICY "Anonymous users can view stores for valid forms" 
ON public.stores 
FOR SELECT 
TO anon 
USING (
  CASE 
    WHEN current_setting('app.current_form_id', true) IS NULL OR current_setting('app.current_form_id', true) = '' THEN
      false
    ELSE
      organization_id = public.get_form_organization_id(
        current_setting('app.current_form_id', true)::UUID
      )
  END
);

-- Create a test function to help debug the session variable
CREATE OR REPLACE FUNCTION public.debug_current_form_id()
RETURNS TABLE(
  current_form_id TEXT,
  is_valid_uuid BOOLEAN,
  organization_from_form TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    current_setting('app.current_form_id', true) as current_form_id,
    CASE 
      WHEN current_setting('app.current_form_id', true) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
      THEN true 
      ELSE false 
    END as is_valid_uuid,
    public.get_form_organization_id(
      CASE 
        WHEN current_setting('app.current_form_id', true) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN current_setting('app.current_form_id', true)::UUID
        ELSE NULL
      END
    ) as organization_from_form;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.debug_current_form_id() TO anon;

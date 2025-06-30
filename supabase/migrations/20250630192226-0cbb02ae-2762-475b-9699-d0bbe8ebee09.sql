
-- Create a new function to get stores for a specific form
CREATE OR REPLACE FUNCTION public.get_stores_for_form(form_id UUID)
RETURNS TABLE(
  id UUID, 
  name TEXT, 
  organization_id TEXT,
  address TEXT,
  phone TEXT,
  email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.organization_id, s.address, s.phone, s.email
  FROM public.stores s
  JOIN public.anamnes_forms f ON f.organization_id = s.organization_id
  WHERE f.id = form_id
  ORDER BY s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to anonymous users (for customer info page)
GRANT EXECUTE ON FUNCTION public.get_stores_for_form(UUID) TO anon;

-- Clean up the old RLS policy that was causing issues
DROP POLICY IF EXISTS "Anonymous users can view stores for valid forms" ON public.stores;

-- Fix the function to have proper search_path security
CREATE OR REPLACE FUNCTION public.protect_user_critical_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow admins to change roles
  IF OLD.role != NEW.role AND (auth.jwt() ->> 'org_role'::text) != 'org:admin' THEN
    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;
  
  -- Never allow organization_id changes after creation
  IF OLD.organization_id != NEW.organization_id THEN
    RAISE EXCEPTION 'Organization ID cannot be changed';
  END IF;
  
  -- Never allow clerk_user_id changes after creation
  IF OLD.clerk_user_id != NEW.clerk_user_id THEN
    RAISE EXCEPTION 'Clerk User ID cannot be changed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
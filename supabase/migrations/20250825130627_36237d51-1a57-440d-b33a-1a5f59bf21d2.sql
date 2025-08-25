-- Fix database function security issues by setting search_path
-- This prevents SQL injection attacks through search_path manipulation

-- Fix all functions to have proper search_path settings
CREATE OR REPLACE FUNCTION public.set_access_token(token text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  PERFORM set_config('app.access_token', token, false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_submission_logs_table_function()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Check if the table exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'submission_logs'
  ) THEN
    RETURN true;
  END IF;
  
  -- Create the table if it doesn't exist
  CREATE TABLE IF NOT EXISTS public.submission_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT,
    entry_id UUID,
    is_optician BOOLEAN DEFAULT false,
    status TEXT,
    error_details TEXT,
    update_data_sample TEXT,
    timestamp TIMESTAMPTZ DEFAULT now()
  );
  
  -- Comment on table
  COMMENT ON TABLE public.submission_logs IS 'Logs of form submission attempts for debugging';
  
  -- Allow anyone to insert but only service role to read
  ALTER TABLE public.submission_logs ENABLE ROW LEVEL SECURITY;
  
  -- Create policy for insert
  CREATE POLICY "Anyone can insert logs" 
    ON public.submission_logs 
    FOR INSERT 
    TO anon 
    WITH CHECK (true);
  
  -- Create policy for select (admin only)
  CREATE POLICY "Only service role can read logs" 
    ON public.submission_logs 
    FOR SELECT
    USING (auth.jwt() ->> 'role' = 'service_role');
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating submission logs table: %', SQLERRM;
    RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_auto_deletion_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  -- If status changed to 'journaled' or 'ready', set auto_deletion_timestamp to 48 hours from now
  IF (NEW.status = 'journaled' OR NEW.status = 'ready') AND 
     (OLD.status IS NULL OR OLD.status <> NEW.status OR NEW.auto_deletion_timestamp IS NULL) THEN
    NEW.auto_deletion_timestamp := NOW() + INTERVAL '48 hours';
  END IF;

  -- For backward compatibility, also check for 'reviewed' status
  IF (NEW.status = 'reviewed') AND 
     (OLD.status IS NULL OR OLD.status <> NEW.status OR NEW.auto_deletion_timestamp IS NULL) THEN
    NEW.auto_deletion_timestamp := NOW() + INTERVAL '48 hours';
  END IF;

  -- If status changed to something else, clear the auto_deletion_timestamp
  IF (NEW.status <> 'journaled' AND NEW.status <> 'ready' AND NEW.status <> 'reviewed' AND NEW.status IS NOT NULL) THEN
    NEW.auto_deletion_timestamp := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_form_organization_id(form_id_param uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT organization_id FROM public.anamnes_forms WHERE id = form_id_param;
$function$;

CREATE OR REPLACE FUNCTION public.set_current_form_id(form_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Set the configuration
  PERFORM set_config('app.current_form_id', form_id::text, false);
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error setting current_form_id: %', SQLERRM;
    RAISE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.debug_current_form_id()
 RETURNS TABLE(current_form_id text, is_valid_uuid boolean, organization_from_form text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_stores_for_form(form_id uuid)
 RETURNS TABLE(id uuid, name text, organization_id text, address text, phone text, email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.organization_id, s.address, s.phone, s.email
  FROM public.stores s
  JOIN public.anamnes_forms f ON f.organization_id = s.organization_id
  WHERE f.id = form_id
  ORDER BY s.name;
END;
$function$;
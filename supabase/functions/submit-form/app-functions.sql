
-- This SQL file contains functions that need to be created in the database
-- for the submit-form edge function to work properly.
-- To use these functions, run this SQL in the Supabase SQL editor.

-- Function to create the submission logs table
CREATE OR REPLACE FUNCTION public.create_submission_logs_table_function()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_submission_logs_table_function() TO anon;
GRANT EXECUTE ON FUNCTION public.create_submission_logs_table_function() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_submission_logs_table_function() TO service_role;

-- Fix extension schema placement to prevent security warnings
-- Move extensions from public schema to proper extension schemas

-- First check if we need to move pg_cron
DO $$
BEGIN
  -- Drop the existing extensions from public if they exist there
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    DROP EXTENSION pg_cron CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    DROP EXTENSION pg_net CASCADE;
  END IF;
END $$;

-- Create extensions in the proper schema (extensions schema)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Recreate the cron job since it was dropped with CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cleanup-access-logs-monthly'
  ) THEN
    PERFORM cron.schedule(
      'cleanup-access-logs-monthly',
      '0 3 1 * *',
      $cron$
      select
        net.http_post(
          url:='https://jawtwwwelxaaprzsqfyp.supabase.co/functions/v1/cleanup-access-logs',
          headers:='{"Content-Type":"application/json"}'::jsonb,
          body:='{"retentionMonths":60,"dryRun":false}'::jsonb
        ) as request_id;
      $cron$
    );
  END IF;
END $$;
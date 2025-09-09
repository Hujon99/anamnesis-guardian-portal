-- Enable required extensions for scheduling HTTP requests
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Schedule monthly cleanup of access logs (runs on the 1st of every month at 03:00 UTC)
-- Uses a safe guard to avoid duplicate jobs if it already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cleanup-access-logs-monthly'
  ) THEN
    PERFORM cron.schedule(
      'cleanup-access-logs-monthly',              -- unique job name
      '0 3 1 * *',                                -- CRON: 03:00 UTC, day 1 monthly
      $$
      select
        net.http_post(
          url:='https://jawtwwwelxaaprzsqfyp.supabase.co/functions/v1/cleanup-access-logs',
          headers:='{"Content-Type":"application/json"}'::jsonb,
          body:='{"retentionMonths":60,"dryRun":false}'::jsonb
        ) as request_id;
      $$
    );
  END IF;
END
$$;
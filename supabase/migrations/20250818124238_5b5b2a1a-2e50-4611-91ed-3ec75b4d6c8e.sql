-- Enable required extensions for cron functionality
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create partial index for efficient querying of stuck forms
CREATE INDEX IF NOT EXISTS idx_anamnes_entries_stuck_forms 
ON anamnes_entries (created_at, status) 
WHERE status = 'sent';

-- Schedule cron job to run cleanup every hour
SELECT cron.schedule(
  'cleanup-stuck-forms-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://jawtwwwelxaaprzsqfyp.supabase.co/functions/v1/auto-delete-entries',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imphd3R3d3dlbHhhYXByenNxZnlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1MDMzMTYsImV4cCI6MjA1ODA3OTMxNn0.FAAh0QpAM18T2pDrohTUBUMcNez8dnmIu3bpRoa8Yhk"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);
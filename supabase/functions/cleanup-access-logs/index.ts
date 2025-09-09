/**
 * cleanup-access-logs (Supabase Edge Function)
 *
 * Purpose:
 * - Permanently delete access/audit logs older than a defined retention window (default 60 months / 5 years).
 * - Targets the following tables: `audit_data_access` and `audit_auth_logs`.
 *
 * Why:
 * - GDPR/Data minimization: keep only what is necessary.
 *
 * How:
 * - Uses service role key (RLS bypass) to perform deletions safely on the server side.
 * - Supports an optional request body with:
 *     {
 *       retentionMonths?: number; // default 60
 *       dryRun?: boolean;         // if true, only returns counts without deleting
 *     }
 * - Always CORS-enabled for browser invocation.
 *
 * Invocation example (client):
 *   const { data, error } = await supabase.functions.invoke('cleanup-access-logs', {
 *     body: { retentionMonths: 60, dryRun: false }
 *   });
 *
 * Scheduling:
 * - Can be scheduled via pg_cron + pg_net to run monthly. Ask to enable if desired.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Payload = {
  retentionMonths?: number;
  dryRun?: boolean;
};

function getCutoffISO(retentionMonths: number): string {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - retentionMonths);
  return cutoff.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { retentionMonths = 60, dryRun = false } = (await req.json().catch(() => ({}))) as Payload;
    const cutoffISO = getCutoffISO(Math.max(1, Math.floor(retentionMonths))); // guard

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error('Missing Supabase credentials');
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // If dryRun: only count rows to be deleted
    if (dryRun) {
      const [{ count: accessCount, error: accessErr }, { count: authCount, error: authErr }] = await Promise.all([
        supabase
          .from('audit_data_access')
          .select('id', { count: 'exact', head: true })
          .lt('created_at', cutoffISO),
        supabase
          .from('audit_auth_logs')
          .select('id', { count: 'exact', head: true })
          .lt('created_at', cutoffISO),
      ]);

      if (accessErr || authErr) {
        console.error('Dry-run count errors', { accessErr, authErr });
        return new Response(
          JSON.stringify({ error: 'Failed to count rows for dry-run', details: { accessErr, authErr } }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          mode: 'dry-run',
          cutoffISO,
          counts: {
            audit_data_access: accessCount ?? 0,
            audit_auth_logs: authCount ?? 0,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Perform deletions with returning IDs to get precise counts
    const [{ data: deletedAccess, error: delAccessErr }, { data: deletedAuth, error: delAuthErr }] = await Promise.all([
      supabase
        .from('audit_data_access')
        .delete()
        .lt('created_at', cutoffISO)
        .select('id'),
      supabase
        .from('audit_auth_logs')
        .delete()
        .lt('created_at', cutoffISO)
        .select('id'),
    ]);

    if (delAccessErr || delAuthErr) {
      console.error('Deletion errors', { delAccessErr, delAuthErr });
      return new Response(
        JSON.stringify({ error: 'Failed to delete old logs', details: { delAccessErr, delAuthErr } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = {
      cutoffISO,
      deleted: {
        audit_data_access: deletedAccess?.length ?? 0,
        audit_auth_logs: deletedAuth?.length ?? 0,
      },
    };

    console.log('cleanup-access-logs result', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unhandled error in cleanup-access-logs', err);
    return new Response(
      JSON.stringify({ error: 'Unhandled error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

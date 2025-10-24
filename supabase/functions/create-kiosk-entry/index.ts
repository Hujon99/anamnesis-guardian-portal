/**
 * Edge Function: create-kiosk-entry
 * 
 * Creates a new anamnes_entry on-demand for a reusable kiosk session.
 * This allows a single QR code to be used by multiple patients sequentially.
 * 
 * Flow:
 * 1. Receives persistent_token from kiosk_sessions
 * 2. Validates the session is active and not expired
 * 3. Creates a new anamnes_entry with a unique access_token
 * 4. Updates session statistics (total_submissions, last_used_at)
 * 5. Returns the temporary access_token for the new entry
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.40.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  persistent_token: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { persistent_token }: RequestBody = await req.json();

    if (!persistent_token) {
      return new Response(
        JSON.stringify({ error: 'persistent_token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-kiosk-entry] Validating session with token:', persistent_token.substring(0, 8) + '...');

    // 1. Fetch and validate kiosk session
    const { data: session, error: sessionError } = await supabase
      .from('kiosk_sessions')
      .select('*')
      .eq('persistent_token', persistent_token)
      .single();

    if (sessionError || !session) {
      console.error('[create-kiosk-entry] Session not found:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive kiosk session' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if session is active
    if (!session.is_active) {
      console.log('[create-kiosk-entry] Session is not active');
      return new Response(
        JSON.stringify({ error: 'Kiosk session is paused' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if session has expired
    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      console.log('[create-kiosk-entry] Session has expired');
      return new Response(
        JSON.stringify({ error: 'Kiosk session has expired' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-kiosk-entry] Session validated, creating new entry...');

    // 2. Generate unique access token for the new entry
    const access_token = crypto.randomUUID();

    // 3. Create new anamnes_entry
    const { data: newEntry, error: entryError } = await supabase
      .from('anamnes_entries')
      .insert({
        form_id: session.form_id,
        organization_id: session.organization_id,
        store_id: session.store_id,
        access_token: access_token,
        status: 'sent',
        is_kiosk_mode: true,
        require_supervisor_code: session.require_supervisor_code,
        created_by: 'kiosk_system',
        created_by_name: 'Kiosk',
        answers: {},
      })
      .select()
      .single();

    if (entryError || !newEntry) {
      console.error('[create-kiosk-entry] Failed to create entry:', entryError);
      return new Response(
        JSON.stringify({ error: 'Failed to create form entry', details: entryError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-kiosk-entry] Entry created:', newEntry.id);

    // 4. Update session statistics
    const { error: updateError } = await supabase
      .from('kiosk_sessions')
      .update({
        total_submissions: (session.total_submissions || 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    if (updateError) {
      console.error('[create-kiosk-entry] Failed to update session stats:', updateError);
      // Non-critical error, continue anyway
    }

    console.log('[create-kiosk-entry] Success! Returning access token');

    // 5. Return the temporary access token
    return new Response(
      JSON.stringify({
        success: true,
        access_token: access_token,
        entry_id: newEntry.id,
        require_supervisor_code: session.require_supervisor_code,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[create-kiosk-entry] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

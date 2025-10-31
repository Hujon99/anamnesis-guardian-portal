/**
 * Edge Function: generate-ciss-token
 * 
 * Purpose: Generate a unique, temporary access token for CISS form access
 * 
 * Flow:
 * 1. Receives organization_id from URL path
 * 2. Finds the active CISS form for that organization
 * 3. Generates a unique access token (UUID)
 * 4. Creates a new anamnes_entries record with 24h expiry
 * 5. Returns the token for redirect to patient form
 * 
 * Security: Public endpoint (no JWT verification) - token-based access control
 * GDPR: Each scan creates a unique entry with automatic expiration
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract organization_id from request body
    const { organizationId } = await req.json();

    if (!organizationId) {
      console.error('No organization ID provided');
      return new Response(
        JSON.stringify({ error: 'Organization ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[CISS Token] Generating token for organization: ${organizationId}`);

    // Find the active CISS form for this organization
    // Note: CISS uses 'Synundersökning' as examination_type with CISS in title
    const { data: forms, error: formError } = await supabase
      .from('anamnes_forms')
      .select('id')
      .eq('organization_id', organizationId)
      .ilike('title', '%CISS%')
      .eq('is_active', true)
      .limit(1);

    if (formError) {
      console.error('[CISS Token] Error finding CISS form:', formError);
      return new Response(
        JSON.stringify({ error: 'Error finding CISS form', details: formError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!forms || forms.length === 0) {
      console.error('[CISS Token] No active CISS form found for organization:', organizationId);
      return new Response(
        JSON.stringify({ 
          error: 'No active CISS form found for this organization',
          hint: 'Please create a CISS form in the admin panel first'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formId = forms[0].id;
    console.log(`[CISS Token] Found CISS form: ${formId}`);

    // Generate unique access token
    const accessToken = crypto.randomUUID();
    
    // Set expiry to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    console.log(`[CISS Token] Creating entry with token expiry: ${expiresAt.toISOString()}`);

    // Create new anamnes_entries record
    const { data: entry, error: entryError } = await supabase
      .from('anamnes_entries')
      .insert({
        form_id: formId,
        organization_id: organizationId,
        access_token: accessToken,
        expires_at: expiresAt.toISOString(),
        status: 'sent',
        examination_type: 'Synundersökning',
        is_magic_link: true,
      })
      .select('id')
      .single();

    if (entryError) {
      console.error('[CISS Token] Error creating entry:', entryError);
      return new Response(
        JSON.stringify({ error: 'Error creating form entry', details: entryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[CISS Token] Success! Entry ID: ${entry.id}, Token: ${accessToken.substring(0, 8)}...`);

    // Return token and redirect URL
    const redirectUrl = `/patient-form?token=${accessToken}`;
    
    return new Response(
      JSON.stringify({
        success: true,
        token: accessToken,
        entryId: entry.id,
        redirectUrl,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[CISS Token] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

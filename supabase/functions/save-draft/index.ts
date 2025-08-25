/**
 * Save Draft Edge Function
 * Handles auto-save functionality for forms by validating tokens and updating draft data.
 * This function ensures secure access to patient data through token validation.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { token, formData } = requestBody;

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!formData) {
      return new Response(
        JSON.stringify({ error: 'Form data is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[save-draft] Processing save for token: ${token.substring(0, 6)}...`);

    // Create Supabase client with service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First verify the token exists and is valid
    const { data: entry, error: fetchError } = await supabase
      .from('anamnes_entries')
      .select('*')
      .eq('access_token', token)
      .maybeSingle();

    if (fetchError) {
      console.error("[save-draft] Database error:", fetchError);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!entry) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if token has expired
    if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Token expired', expired: true }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Don't allow saving if already submitted
    if (entry.status === 'ready' || entry.status === 'submitted') {
      return new Response(
        JSON.stringify({ error: 'Form already submitted', submitted: true }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Skip save if data is empty or only contains empty values
    const hasValues = Object.values(formData).some(value => 
      value !== null && value !== undefined && value !== "" && 
      (Array.isArray(value) ? value.length > 0 : true)
    );
    
    if (!hasValues) {
      console.log("[save-draft] No meaningful data to save");
      return new Response(
        JSON.stringify({ success: true, message: 'No data to save' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Format data for storage
    const formattedRawData = JSON.stringify({ 
      answers: formData,
      meta: {
        auto_saved: true,
        saved_at: new Date().toISOString(),
        form_template_id: entry.form_id || null
      }
    });

    // Update the entry with draft data
    const { error: updateError } = await supabase
      .from('anamnes_entries')
      .update({ 
        formatted_raw_data: formattedRawData,
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', entry.id);

    if (updateError) {
      console.error("[save-draft] Update error:", updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save draft' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[save-draft] Draft saved successfully for entry: ${entry.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Draft saved successfully',
        savedAt: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[save-draft] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
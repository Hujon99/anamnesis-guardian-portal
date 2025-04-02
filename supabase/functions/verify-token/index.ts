
/**
 * This edge function verifies patient access tokens for anamnes forms.
 * It handles token validation, checks expiration, and verifies form status
 * before allowing patients to access and complete their forms.
 * It also returns the form template along with the entry data to simplify
 * the patient form page implementation.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting verify-token function - v3');
    console.log('Request URL:', req.url);
    console.log('Request method:', req.method);
    
    // Using direct environment variables for simplicity and reliability
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials:', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseKey 
      });
      return new Response(
        JSON.stringify({ 
          error: 'Konfigurationsfel',
          details: 'Saknar Supabase-konfiguration',
          code: 'config_error'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log('Creating Supabase client with URL:', supabaseUrl.substring(0, 15) + '...');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    let token;
    try {
      const requestData = await req.json();
      token = requestData.token;
      console.log(`Request data parsed, token: ${token ? token.substring(0, 6) + '...' : 'missing'}`);
    } catch (parseError) {
      console.error('Error parsing request JSON:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Ogiltig förfrågan, token saknas',
          details: 'JSON parse error',
          code: 'invalid_request'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    if (!token) {
      console.error('Token missing in request');
      return new Response(
        JSON.stringify({ error: 'Token är obligatorisk' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Verifying token: ${token.substring(0, 6)}...`);
    
    // Direct database query for the entry with this token - more reliable than RPC
    const { data: entryData, error: entryError } = await supabase
      .from('anamnes_entries')
      .select('*')
      .eq('access_token', token)
      .single();
    
    if (entryError) {
      console.error('Error fetching entry with token:', entryError);
      return new Response(
        JSON.stringify({ 
          error: 'Ogiltig eller utgången länk',
          details: entryError.message,
          code: 'invalid_token'
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`Found entry with ID: ${entryData.id}, status: ${entryData.status}`);
    
    // Check if the entry has an organization ID
    if (!entryData.organization_id) {
      console.error('Missing organization_id for entry:', entryData.id);
      return new Response(
        JSON.stringify({ 
          error: 'Formulärkonfigurationen är ogiltig',
          details: 'Saknar organisationsdata',
          code: 'missing_org'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Check if the entry is expired
    if (entryData.expires_at && new Date(entryData.expires_at) < new Date()) {
      console.log(`Token expired at ${entryData.expires_at}`);
      return new Response(
        JSON.stringify({ 
          error: 'Länken har gått ut',
          status: 'expired',
          code: 'expired'
        }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Check if the status is not 'sent' - patient can only fill forms in 'sent' status
    if (entryData.status !== 'sent') {
      let message = 'Formuläret kan inte fyllas i för tillfället';
      let statusCode = 403;
      let errorCode = 'invalid_status';
      
      if (entryData.status === 'pending' || entryData.status === 'ready' || entryData.status === 'reviewed') {
        message = 'Formuläret har redan fyllts i';
        statusCode = 400;
        errorCode = 'already_submitted';
      }
      
      console.log(`Invalid status for form submission: ${entryData.status}`);
      return new Response(
        JSON.stringify({ 
          error: message,
          status: entryData.status,
          code: errorCode
        }),
        { 
          status: statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Fetch form template - NEW CODE HERE
    console.log(`Fetching form template for organization: ${entryData.organization_id}`);
    const { data: formData, error: formError } = await supabase
      .from('anamnes_forms')
      .select("*")
      .or(`organization_id.eq.${entryData.organization_id},organization_id.is.null`)
      .order("organization_id", { ascending: false })
      .limit(1)
      .single();
      
    if (formError) {
      console.error("Error fetching form template:", formError);
      return new Response(
        JSON.stringify({ 
          error: "Kunde inte ladda formuläret. Vänligen försök igen senare.",
          details: formError.message,
          code: 'form_error'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    if (!formData) {
      console.error("No form template found for organization:", entryData.organization_id);
      return new Response(
        JSON.stringify({ 
          error: "Inget formulär hittades för denna organisation.",
          code: 'missing_form'
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log('Form template found:', formData.title);
    
    console.log('Token verification successful');
    return new Response(
      JSON.stringify({ 
        success: true,
        entry: entryData,
        formTemplate: formData
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Unexpected error in verify-token function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Ett oväntat fel uppstod', 
        details: error.message,
        code: 'server_error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

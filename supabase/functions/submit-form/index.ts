
/**
 * This edge function handles the submission of patient form data.
 * It validates the token, checks form status, and stores patient answers.
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
    console.log('Starting submit-form function - v4');
    console.log('Request URL:', req.url);
    console.log('Request method:', req.method);
    
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
    
    let token, answers, formData;
    try {
      const requestData = await req.json();
      token = requestData.token;
      answers = requestData.answers;
      formData = requestData.formData;
      console.log(`Request data parsed, token: ${token ? token.substring(0, 6) + '...' : 'missing'}`);
    } catch (parseError) {
      console.error('Error parsing request JSON:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Ogiltig förfrågan',
          details: 'JSON parse error',
          code: 'invalid_request'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    if (!token || !answers) {
      return new Response(
        JSON.stringify({ error: 'Token and answers are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // First verify the token and get the current entry
    await supabase.rpc('set_access_token', { token });
    
    const { data: entry, error: entryError } = await supabase
      .from('anamnes_entries')
      .select('*')
      .eq('access_token', token)
      .maybeSingle(); // Using maybeSingle() instead of single() to handle no results better
      
    if (entryError) {
      console.error('Error fetching entry with token:', entryError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid token',
          details: entryError.message
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Check if entry exists
    if (!entry) {
      console.error('No entry found with token:', token.substring(0, 6) + '...');
      return new Response(
        JSON.stringify({ 
          error: 'Ogiltig länk',
          details: 'Ingen anamnes hittades med denna token',
          code: 'invalid_token'
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Check if the entry is expired
    if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ 
          error: 'Länken har gått ut',
          status: 'expired'
        }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Verify entry status is 'sent'
    if (entry.status !== 'sent') {
      let message = 'Formuläret kan inte fyllas i för tillfället';
      
      if (entry.status === 'pending' || entry.status === 'ready' || entry.status === 'reviewed') {
        message = 'Formuläret har redan fyllts i';
      }
      
      return new Response(
        JSON.stringify({ 
          error: message,
          status: entry.status
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Ensure organization_id is preserved
    if (!entry.organization_id) {
      console.error('Missing organization_id for entry:', entry.id);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid form configuration',
          details: 'Missing organization data'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Prepare the answers data with additional metadata if provided
    const answersData = {
      ...answers,
      ...(formData ? { formMetadata: formData } : {})
    };
    
    // Now that we've set the token, let's update the entry
    const { data, error } = await supabase
      .from('anamnes_entries')
      .update({ 
        answers: answersData,
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('access_token', token)
      .select()
      .maybeSingle(); // Using maybeSingle() for consistency
    
    if (error) {
      console.error('Error updating entry with token:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update entry',
          details: error.message
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log('Form submission successful');
    return new Response(
      JSON.stringify({ 
        success: true,
        entry: data
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Unexpected error in submit-form function:', error);
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

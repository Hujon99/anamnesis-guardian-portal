
/**
 * This edge function verifies patient access tokens for anamnes forms.
 * It handles token validation, checks expiration, and verifies form status
 * before allowing patients to access and complete their forms.
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
    console.log('Starting verify-token function');
    
    // Using direct environment variables for simplicity and reliability
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://jawtwwwelxaaprzsqfyp.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imphd3R3d3dlbHhhYXByenNxZnlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1MDMzMTYsImV4cCI6MjA1ODA3OTMxNn0.FAAh0QpAM18T2pDrohTUBUMcNez8dnmIu3bpRoa8Yhk';
    
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
    const { data, error } = await supabase
      .from('anamnes_entries')
      .select('*')
      .eq('access_token', token)
      .single();
    
    if (error) {
      console.error('Error fetching entry with token:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Ogiltig eller utgången länk',
          details: error.message,
          code: 'invalid_token'
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`Found entry with ID: ${data.id}, status: ${data.status}`);
    
    // Check if the entry has an organization ID
    if (!data.organization_id) {
      console.error('Missing organization_id for entry:', data.id);
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
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      console.log(`Token expired at ${data.expires_at}`);
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
    if (data.status !== 'sent') {
      let message = 'Formuläret kan inte fyllas i för tillfället';
      let statusCode = 403;
      let errorCode = 'invalid_status';
      
      if (data.status === 'pending' || data.status === 'ready' || data.status === 'reviewed') {
        message = 'Formuläret har redan fyllts i';
        statusCode = 400;
        errorCode = 'already_submitted';
      }
      
      console.log(`Invalid status for form submission: ${data.status}`);
      return new Response(
        JSON.stringify({ 
          error: message,
          status: data.status,
          code: errorCode
        }),
        { 
          status: statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log('Token verification successful');
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

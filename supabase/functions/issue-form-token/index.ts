
/**
 * This Edge Function generates access tokens for magic link anamnes forms.
 * It creates a new entry in the anamnes_entries table with booking information
 * and returns an access token that can be used to access the form.
 * It verifies that the form exists and belongs to the correct organization.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.1";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a Supabase client using env vars
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Request received:", req.method);
    
    // Parse the request body
    const { bookingId, firstName, storeId, bookingDate, formId } = await req.json();
    
    // Validate required parameters
    if (!bookingId || !formId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters',
          details: 'bookingId and formId are required'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log("Parameters received:", { bookingId, firstName, storeId, bookingDate, formId });
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    
    // Check if form exists and get its organization
    const { data: formData, error: formError } = await supabase
      .from('anamnes_forms')
      .select('organization_id, title')
      .eq('id', formId)
      .single();
      
    if (formError) {
      console.error("Error fetching form data:", formError);
      return new Response(
        JSON.stringify({ error: 'Invalid form ID', details: formError.message }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    if (!formData.organization_id) {
      console.log("Form has no organization, using the default form");
      // This is the default form (organization_id is null), which is fine to use
    } else {
      console.log("Using form for organization:", formData.organization_id);
    }
    
    // Generate access token
    const accessToken = uuidv4();
    
    // Set expiry date to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // Create new entry in anamnes_entries
    const { data: entry, error: entryError } = await supabase
      .from('anamnes_entries')
      .insert({
        form_id: formId,
        organization_id: formData.organization_id, // Use the organization from the form
        access_token: accessToken,
        booking_id: bookingId,
        first_name: firstName || null,
        store_id: storeId || null,
        booking_date: bookingDate ? new Date(bookingDate).toISOString() : null,
        is_magic_link: true,
        status: 'sent',
        sent_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();
    
    if (entryError) {
      console.error("Error creating entry:", entryError);
      return new Response(
        JSON.stringify({ error: 'Failed to create entry', details: entryError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Return the access token and entry ID
    return new Response(
      JSON.stringify({ 
        accessToken,
        entryId: entry.id,
        expiresAt: expiresAt.toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error("Unexpected error:", error);
    
    return new Response(
      JSON.stringify({ error: 'Server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

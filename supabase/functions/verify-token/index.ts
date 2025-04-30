
/**
 * This Edge Function verifies access tokens for anamnesis forms.
 * It checks if a token is valid, not expired, and returns the associated entry and form template.
 * Enhanced with improved error reporting, logging and SQL safety.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient, fetchEntryByToken, fetchFormTemplate } from "../utils/databaseUtils.ts";
import { validateRequestAndExtractToken } from "../utils/validationUtils.ts";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting verify-token edge function execution");
    
    // Enhanced token extraction and validation
    const { token, isValid, error } = await validateRequestAndExtractToken(req);
    
    if (!isValid || !token) {
      console.error("Invalid token request:", error);
      return new Response(
        JSON.stringify({ error: error?.message || 'Invalid request', code: error?.code || 'invalid_request' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log("Verifying token:", token.substring(0, 6) + "...");

    // Initialize Supabase client
    const supabase = createSupabaseClient();
    if (!supabase) {
      console.error("Failed to initialize Supabase client");
      return new Response(
        JSON.stringify({ error: 'Failed to initialize database client' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Find the entry by token
    const { entry, error: entryError, notFound: entryNotFound } = await fetchEntryByToken(supabase, token);

    if (entryError) {
      console.error("Database error fetching entry:", entryError);
      return new Response(
        JSON.stringify({ 
          error: 'Database error', 
          details: entryError 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (entryNotFound) {
      console.error("Token not found in database");
      return new Response(
        JSON.stringify({ 
          error: 'Token not found' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Process the entry and return appropriate response
    return await processEntryAndRespond(entry, supabase, corsHeaders);

  } catch (err) {
    console.error("Unexpected error:", err);
    
    return new Response(
      JSON.stringify({ 
        error: 'Server error',
        details: err.message || String(err)
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper function to process the entry and return the appropriate response
async function processEntryAndRespond(entry: any, supabase: any, corsHeaders: any) {
  // Check if the entry has expired
  if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
    console.log("Token expired, expires_at:", entry.expires_at);
    return new Response(
      JSON.stringify({ 
        error: 'Token expired',
        expired: true,
        entry: {
          id: entry.id,
          expires_at: entry.expires_at
        }
      }),
      { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Check if the form has already been submitted
  if (entry.status === 'submitted') {
    console.log("Form already submitted, status:", entry.status);
    return new Response(
      JSON.stringify({ 
        submitted: true,
        entry: {
          id: entry.id,
          status: entry.status,
          submitted_at: entry.updated_at
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Fetch the form template for this entry
  const { formTemplate, error: formError, notFound: formNotFound } = 
    await fetchFormTemplate(supabase, entry.organization_id);

  if (formError) {
    console.error("Form template error:", formError);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch form template',
        details: formError
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  if (formNotFound) {
    console.error("Form template not found for organization:", entry.organization_id);
    return new Response(
      JSON.stringify({ 
        error: 'Form template not found' 
      }),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Extract entry data to return
  const entryData = {
    id: entry.id,
    organization_id: entry.organization_id,
    status: entry.status,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
    formatted_raw_data: entry.formatted_raw_data,
    patient_identifier: entry.patient_identifier,
    created_by: entry.created_by,
    created_by_name: entry.created_by_name,
    // Magic link specific fields
    is_magic_link: entry.is_magic_link || false,
    booking_id: entry.booking_id,
    store_id: entry.store_id,
    first_name: entry.first_name,
    booking_date: entry.booking_date
  };

  console.log("Token verification successful, returning data");
  
  // Return success with form template and entry data
  return new Response(
    JSON.stringify({ 
      verified: true,
      formTemplate,
      entry: entryData
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

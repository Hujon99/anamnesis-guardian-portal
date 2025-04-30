
/**
 * This Edge Function verifies access tokens for anamnesis forms.
 * It checks if a token is valid, not expired, and returns the associated entry and form template.
 * Enhanced to handle magic link entries and return booking information when available.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient, fetchEntryByToken, fetchFormTemplate } from "../utils/databaseUtils.ts";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body to get the token
    const requestData = await req.json().catch(error => {
      console.error("Failed to parse request JSON:", error);
      return { token: null };
    });
    
    const { token } = requestData;

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing token' }),
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
      console.error("Database error:", entryError);
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

    // Check if the entry has expired
    if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
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

    // Extract entry data to return, including magic link information if available
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

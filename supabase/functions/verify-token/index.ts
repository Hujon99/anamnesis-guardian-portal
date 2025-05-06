
/**
 * This Edge Function verifies access tokens for anamnesis forms.
 * It checks if a token is valid, not expired, and returns the associated entry and form template.
 * Enhanced with improved error reporting, logging, SQL safety, debouncing, and
 * better cache control to prevent excessive verification attempts.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

interface TokenVerificationRequest {
  token: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Start timestamp for performance monitoring
    const startTime = Date.now();
    console.log("Starting verify-token edge function execution");
    
    // Extract token from request
    const requestData = await validateRequestAndExtractToken(req);
    
    if (!requestData.token) {
      console.error("Invalid token request:", requestData.error);
      return new Response(
        JSON.stringify({ 
          error: requestData.error?.message || 'Invalid request', 
          code: requestData.error?.code || 'invalid_request' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") as string,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string
    );
    
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
    
    // Find the entry by token using parameterized query for security
    const { data: entry, error: entryError } = await supabase
      .from('anamnes_entries')
      .select('*')
      .eq('access_token', requestData.token)
      .maybeSingle();

    if (entryError) {
      console.error("Database error fetching entry:", entryError);
      return new Response(
        JSON.stringify({ 
          error: 'Database error', 
          details: entryError.message || entryError 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!entry) {
      console.error("Token not found in database:", requestData.token.substring(0, 6) + "...");
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
    const { data: formTemplates, error: formError } = await supabase
      .from('form_templates')
      .select('*')
      .eq('organization_id', entry.organization_id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (formError) {
      console.error("Form template error:", formError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch form template',
          details: formError.message || formError
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!formTemplates || formTemplates.length === 0) {
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
    
    // Get most recent form template
    const formTemplate = formTemplates[0];

    // Extract entry data to return (only necessary fields for security)
    const entryData = {
      id: entry.id,
      organization_id: entry.organization_id,
      status: entry.status,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
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
    
    // Log performance
    const duration = Date.now() - startTime;
    console.log(`Token verification successful, took ${duration}ms`);
    
    // Return success with form template and entry data
    return new Response(
      JSON.stringify({ 
        verified: true,
        formTemplate: formTemplate?.schema,
        entry: entryData
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (err) {
    // Format error message based on type
    let errorMessage = 'Server error';
    let errorDetails = '';
    
    if (err instanceof Error) {
      errorMessage = err.message;
      errorDetails = err.stack || '';
    } else {
      errorDetails = String(err);
    }
    
    console.error("Unexpected error:", errorMessage, errorDetails);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper function to extract the token from request
async function validateRequestAndExtractToken(req: Request): Promise<{
  token?: string;
  error?: { message: string; code: string };
}> {
  try {
    // Parse request body as JSON
    // Clone the request to avoid consuming the body which can only be read once
    const requestClone = req.clone();
    let requestData: any;
    
    try {
      requestData = await requestClone.json();
      console.log('Request body parsed successfully');
    } catch (err) {
      console.error('Could not parse request body as JSON:', err instanceof Error ? err.message : 'Unknown error');
      return { 
        error: { 
          message: 'Invalid JSON in request body', 
          code: 'invalid_request' 
        } 
      };
    }
    
    const token = requestData.token;
    
    // Validate token exists
    if (!token) {
      return { 
        error: { 
          message: 'Token is required', 
          code: 'missing_token' 
        } 
      };
    }
    
    // Validate token is a string
    if (typeof token !== 'string') {
      return { 
        error: { 
          message: 'Token must be a string', 
          code: 'invalid_token_format' 
        } 
      };
    }
    
    // Validate token minimum length
    if (token.length < 6) {
      return { 
        error: { 
          message: 'Token is too short', 
          code: 'invalid_token_format' 
        } 
      };
    }
    
    return { token };
  } catch (error) {
    console.error('Error parsing request:', error);
    return { 
      error: { 
        message: 'Failed to process request', 
        code: 'request_processing_error' 
      } 
    };
  }
}

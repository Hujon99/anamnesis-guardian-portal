
/**
 * This Edge Function verifies access tokens for anamnesis forms.
 * It checks if a token is valid, not expired, and returns the associated entry and form template.
 * Enhanced with improved error reporting, logging, SQL safety, debouncing, and
 * better cache control to prevent excessive verification attempts.
 * Also includes better handling of missing or invalid tokens.
 * FIXED: Now uses correct table name 'anamnes_forms' instead of 'form_templates'
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";
import { validateRequestAndExtractToken } from "../utils/validationUtils.ts";

// Define CORS headers with improved cache control for stability
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'private, max-age=60, must-revalidate', // Allow caching for 60 seconds
  'Pragma': 'no-cache',
  'Expires': '0',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Generate a unique request ID for tracing
    const requestId = crypto.randomUUID().substring(0, 8);
    const startTime = Date.now();
    console.log(`[verify-token/${requestId}]: Starting token verification`);
    
    // Extract token from request using validation utility
    const validationResult = await validateRequestAndExtractToken(req);
    
    if (!validationResult.isValid || !validationResult.token) {
      console.error(`[verify-token/${requestId}]: Invalid token request:`, validationResult.error);
      return new Response(
        JSON.stringify({ 
          error: validationResult.error?.message || 'Invalid request', 
          code: validationResult.error?.code || 'invalid_request',
          details: validationResult.error?.details || 'Token validation failed',
          requestId
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const token = validationResult.token;
    console.log(`[verify-token/${requestId}]: Extracted token: ${token.substring(0, 6)}...`);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.error(`[verify-token/${requestId}]: Missing Supabase credentials`);
      return new Response(
        JSON.stringify({ 
          error: 'Internal server configuration error',
          requestId
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    if (!supabase) {
      console.error(`[verify-token/${requestId}]: Failed to initialize Supabase client`);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to initialize database client',
          requestId
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Find the entry by token using parameterized query
    const { data: entry, error: entryError } = await supabase
      .from('anamnes_entries')
      .select('*')
      .eq('access_token', token)
      .maybeSingle();

    if (entryError) {
      console.error(`[verify-token/${requestId}]: Database error fetching entry:`, entryError);
      return new Response(
        JSON.stringify({ 
          error: 'Database error', 
          details: entryError.message || entryError,
          requestId
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!entry) {
      console.error(`[verify-token/${requestId}]: Token not found in database: ${token.substring(0, 6)}...`);
      return new Response(
        JSON.stringify({ 
          error: 'Token not found',
          requestId
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check if the entry has expired
    if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
      console.log(`[verify-token/${requestId}]: Token expired, expires_at: ${entry.expires_at}`);
      return new Response(
        JSON.stringify({ 
          error: 'Token expired',
          expired: true,
          requestId,
          entry: {
            id: entry.id,
            organization_id: entry.organization_id,
            expires_at: entry.expires_at,
            form_id: entry.form_id
          }
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if the form has already been submitted
    if (entry.status === 'ready') {
      console.log(`[verify-token/${requestId}]: Form already submitted, status: ${entry.status}`);
      return new Response(
        JSON.stringify({ 
          submitted: true,
          requestId,
          entry: {
            id: entry.id,
            organization_id: entry.organization_id,
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

    // Fetch the form template for this entry - FIXED: Use correct table name 'anamnes_forms'
    const { data: formTemplates, error: formError } = await supabase
      .from('anamnes_forms')
      .select('*')
      .eq('organization_id', entry.organization_id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (formError) {
      console.error(`[verify-token/${requestId}]: Form template error:`, formError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch form template',
          requestId,
          details: formError.message || formError
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!formTemplates || formTemplates.length === 0) {
      console.error(`[verify-token/${requestId}]: Form template not found for organization: ${entry.organization_id}`);
      return new Response(
        JSON.stringify({ 
          error: 'Form template not found',
          requestId,
          details: `No form template found for organization: ${entry.organization_id}`
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
      form_id: entry.form_id,
      status: entry.status,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
      patient_identifier: entry.patient_identifier,
      created_by: entry.created_by,
      created_by_name: entry.created_by_name,
      examination_type: entry.examination_type,
      // Magic link specific fields
      is_magic_link: entry.is_magic_link || false,
      booking_id: entry.booking_id,
      store_id: entry.store_id,
      first_name: entry.first_name,
      booking_date: entry.booking_date
    };
    
    // Log performance and anonymized access
    const duration = Date.now() - startTime;

    // Helper functions scoped to this request
    const getClientIp = (headers: Headers) => {
      const xff = headers.get('x-forwarded-for') || '';
      const xri = headers.get('x-real-ip') || '';
      const raw = xff.split(',')[0].trim() || xri || '';
      return raw;
    };
    const anonymizeIP = (ip: string) => {
      if (!ip) return 'unknown';
      if (ip.includes('.')) {
        const parts = ip.split('.');
        if (parts.length === 4) {
          parts[3] = '0';
          return parts.join('.');
        }
      }
      if (ip.includes(':')) {
        const parts = ip.split(':');
        const keep = parts.slice(0, 4).join(':');
        return `${keep}::`;
      }
      return 'unknown';
    };

    const clientIp = getClientIp(req.headers);
    const anonymizedIp = anonymizeIP(clientIp);
    const userAgent = req.headers.get('user-agent') || null;

    try {
      await supabase.from('audit_data_access').insert([
        {
          user_id: 'anonymous',
          organization_id: entry.organization_id,
          table_name: 'anamnes_entries',
          record_id: String(entry.id),
          action_type: 'token_verify',
          purpose: 'public_form',
          route: 'edge:verify-token',
          ip_address_anonymized: anonymizedIp,
          user_agent: userAgent,
        },
      ]);
      console.log(`[verify-token/${requestId}]: Logged anonymized access for entry ${entry.id}`);
    } catch (logErr) {
      console.warn(`[verify-token/${requestId}]: Failed to log anonymized access`, logErr);
    }

    console.log(`[verify-token/${requestId}]: Token verification successful in ${duration}ms`);
    
    // Return success with form template and entry data
    return new Response(
      JSON.stringify({ 
        verified: true,
        requestId,
        formTemplate: formTemplate?.schema,
        entry: entryData
      }),
      { 
        status: 200, 
        headers: {
          ...corsHeaders, 
          'Content-Type': 'application/json',
          // Strong cache control for successful verification responses
          'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
          'ETag': `"${requestId}"` // Add ETag for cache validation
        } 
      }
    );
  } catch (err) {
    // Format error message
    let errorMessage = 'Server error';
    let errorDetails = '';
    const errorId = crypto.randomUUID().substring(0, 8);
    
    if (err instanceof Error) {
      errorMessage = err.message;
      errorDetails = err.stack || '';
    } else {
      errorDetails = String(err);
    }
    
    console.error(`[verify-token/error-${errorId}]: Unexpected error:`, errorMessage, errorDetails);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        errorId,
        details: errorDetails
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store' // Prevent caching of error responses
        } 
      }
    );
  }
});

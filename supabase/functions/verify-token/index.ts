
/**
 * Verify Token Edge Function
 * 
 * This edge function verifies patient access tokens for anamnes forms.
 * It handles token validation and returns the form template for rendering.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  handleCors, 
  createSuccessResponse, 
  createErrorResponse,
  logFunctionStart
} from "../utils/responseUtils.ts";
import { validateRequestAndExtractToken } from "../utils/validationUtils.ts";
import { createSupabaseClient, fetchEntryByToken, fetchFormTemplate } from "../utils/databaseUtils.ts";

const FUNCTION_VERSION = "v8.5";
const FUNCTION_NAME = "verify-token";

serve(async (req: Request) => {
  try {
    // Handle CORS preflight requests
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Log function start
    logFunctionStart(FUNCTION_NAME, FUNCTION_VERSION, req);

    // Create Supabase client
    const supabase = createSupabaseClient();
    if (!supabase) {
      return createErrorResponse(
        'Konfigurationsfel',
        'config_error',
        500,
        'Saknar Supabase-konfiguration'
      );
    }

    // Extract and validate token
    const { token, isValid, error: validationError } = await validateRequestAndExtractToken(req);
    
    if (!isValid || !token) {
      return createErrorResponse(
        validationError?.message || 'Invalid token',
        validationError?.code || 'invalid_token',
        400,
        validationError?.details
      );
    }

    // Fetch entry using token
    const { entry, error: entryError, notFound } = await fetchEntryByToken(supabase, token);

    if (entryError) {
      return createErrorResponse(
        'Database error',
        'server_error',
        500,
        entryError.message
      );
    }

    if (notFound) {
      return createErrorResponse(
        'Ogiltig länk',
        'invalid_token',
        404,
        'Ingen anamnes hittades med denna token'
      );
    }

    // Check if entry has expired
    if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
      return createErrorResponse(
        'Länken har gått ut',
        'expired',
        403,
        undefined,
        { status: 'expired' }
      );
    }

    // Fetch form template
    const { formTemplate, error: formError } = await fetchFormTemplate(supabase, entry.organization_id);

    if (formError) {
      return createErrorResponse(
        'Kunde inte hämta formulärmallen',
        'form_error',
        500,
        formError.message
      );
    }

    // Return successful response
    return createSuccessResponse({ 
      entry, 
      formTemplate 
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return createErrorResponse(
      'Ett oväntat fel uppstod',
      'server_error',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

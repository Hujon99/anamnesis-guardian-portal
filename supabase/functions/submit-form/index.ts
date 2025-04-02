
/**
 * Submit Form Edge Function (v5)
 * 
 * This edge function handles the submission of patient form data.
 * It validates the token, checks form status, and stores patient answers.
 * 
 * The function includes comprehensive validation checks, structured error responses,
 * and detailed logging for troubleshooting.
 * 
 * Error handling:
 * - Invalid/missing token or answers: 400 Bad Request
 * - Token not found: 404 Not Found
 * - Invalid form status: 400 Bad Request
 * - Server errors: 500 Internal Server Error
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  handleCors, 
  createSuccessResponse, 
  createErrorResponse,
  logFunctionStart,
  handleUnexpectedError
} from "../utils/responseUtils.ts";
import { validateToken } from "../utils/validationUtils.ts";
import { createSupabaseClient } from "../utils/databaseUtils.ts";

// Version tracking for logs
const FUNCTION_VERSION = "v5";
const FUNCTION_NAME = "submit-form";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
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
    
    // Parse request data
    let token, answers, formData;
    try {
      const requestData = await req.json();
      token = requestData.token;
      answers = requestData.answers;
      formData = requestData.formData;
      console.log(`Request data parsed, token: ${token ? token.substring(0, 6) + '...' : 'missing'}`);
    } catch (parseError) {
      console.error('Error parsing request JSON:', parseError);
      return createErrorResponse(
        'Ogiltig förfrågan',
        'invalid_request',
        400,
        'JSON parse error'
      );
    }
    
    // Validate token
    const tokenValidation = validateToken(token);
    if (!tokenValidation.isValid) {
      return createErrorResponse(
        tokenValidation.error!.message,
        tokenValidation.error!.code as any,
        400
      );
    }
    
    // Validate answers
    if (!answers) {
      return createErrorResponse(
        'Svar är obligatoriska',
        'invalid_request',
        400
      );
    }
    
    // Set access token for RLS policies
    await supabase.rpc('set_access_token', { token });
    
    // Fetch the entry data
    const { data: entry, error: entryError } = await supabase
      .from('anamnes_entries')
      .select('*')
      .eq('access_token', token)
      .maybeSingle();
      
    // Handle entry fetch errors
    if (entryError) {
      console.error('Error fetching entry with token:', entryError);
      return createErrorResponse(
        'Invalid token',
        'invalid_token',
        400,
        entryError.message
      );
    }
    
    // Check if entry exists
    if (!entry) {
      console.error('No entry found with token:', token.substring(0, 6) + '...');
      return createErrorResponse(
        'Ogiltig länk',
        'invalid_token',
        404,
        'Ingen anamnes hittades med denna token'
      );
    }
    
    // Check if the entry is expired
    if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
      return createErrorResponse(
        'Länken har gått ut',
        'expired',
        403,
        undefined,
        { status: 'expired' }
      );
    }
    
    // Verify entry status is 'sent'
    if (entry.status !== 'sent') {
      let message = 'Formuläret kan inte fyllas i för tillfället';
      
      if (entry.status === 'pending' || entry.status === 'ready' || entry.status === 'reviewed') {
        message = 'Formuläret har redan fyllts i';
      }
      
      return createErrorResponse(
        message,
        'invalid_status',
        400,
        undefined,
        { status: entry.status }
      );
    }
    
    // Ensure organization_id is preserved
    if (!entry.organization_id) {
      console.error('Missing organization_id for entry:', entry.id);
      return createErrorResponse(
        'Invalid form configuration',
        'missing_org',
        500,
        'Missing organization data'
      );
    }
    
    // Prepare the answers data with additional metadata if provided
    const answersData = {
      ...answers,
      ...(formData ? { formMetadata: formData } : {})
    };
    
    // Update the entry with answers
    const { data, error } = await supabase
      .from('anamnes_entries')
      .update({ 
        answers: answersData,
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('access_token', token)
      .select()
      .maybeSingle();
    
    // Handle update errors
    if (error) {
      console.error('Error updating entry with token:', error);
      return createErrorResponse(
        'Failed to update entry',
        'server_error',
        500,
        error.message
      );
    }
    
    // Return successful response
    console.log('Form submission successful');
    return createSuccessResponse({ entry: data });
  } catch (error) {
    // Handle unexpected errors
    return handleUnexpectedError(error as Error, FUNCTION_NAME);
  }
});

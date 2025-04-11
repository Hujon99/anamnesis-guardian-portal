
/**
 * Verify Token Edge Function (v8.1)
 * 
 * This edge function verifies patient access tokens for anamnes forms.
 * It handles token validation, checks expiration, and verifies form status
 * before allowing patients to access and complete their forms.
 * 
 * The function returns the form template along with the entry data to simplify
 * the patient form page implementation.
 * 
 * Error handling:
 * - Invalid/missing token: 400 Bad Request
 * - Expired token: 403 Forbidden
 * - Token not found: 404 Not Found
 * - Invalid form status: 403 Forbidden or 400 Bad Request
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
import { validateRequestAndExtractToken } from "../utils/validationUtils.ts";
import { 
  createSupabaseClient, 
  fetchEntryByToken, 
  fetchFormTemplate 
} from "../utils/databaseUtils.ts";

// Version tracking for logs
const FUNCTION_VERSION = "v8.1";
const FUNCTION_NAME = "verify-token";

serve(async (req: Request) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Log function start with more details
    logFunctionStart(FUNCTION_NAME, FUNCTION_VERSION, req);
    console.log(`Request headers:`, Object.fromEntries([...req.headers.entries()]));
    
    // Validate request and extract token
    console.log(`Extracting and validating token from request...`);
    const { token, isValid, error: validationError } = await validateRequestAndExtractToken(req);
    
    if (!isValid) {
      console.error(`Token validation failed:`, validationError);
      return createErrorResponse(
        validationError!.message,
        validationError!.code as any,
        400,
        validationError!.details
      );
    }
    
    console.log(`Token validation successful: ${token!.substring(0, 6)}...`);
    
    // Create Supabase client
    console.log(`Creating Supabase client...`);
    const supabase = createSupabaseClient();
    if (!supabase) {
      console.error(`Failed to create Supabase client: Missing environment variables`);
      return createErrorResponse(
        'Konfigurationsfel',
        'config_error',
        500,
        'Saknar Supabase-konfiguration'
      );
    }
    
    console.log(`Supabase client created successfully`);
    
    // Set access token for RLS policies
    console.log(`Setting access token for RLS policies...`);
    try {
      await supabase.rpc('set_access_token', { token });
      console.log(`Access token set successfully for RLS policies`);
    } catch (rpcError) {
      console.error(`Failed to set access token for RLS:`, rpcError);
      // Continue execution, as this might not be critical depending on RLS setup
    }
    
    // Fetch entry by token
    console.log(`Fetching entry with token: ${token!.substring(0, 6)}...`);
    const { entry, error: entryError, notFound } = await fetchEntryByToken(supabase, token!);
    
    // Handle entry fetch errors
    if (entryError) {
      console.error(`Error fetching entry:`, entryError);
      return createErrorResponse(
        'Ogiltig eller utgången länk',
        'invalid_token',
        404,
        entryError.message
      );
    }
    
    if (notFound) {
      console.error(`No entry found with token: ${token!.substring(0, 6)}...`);
      return createErrorResponse(
        'Ogiltig länk',
        'invalid_token',
        404,
        'Ingen anamnes hittades med denna token'
      );
    }
    
    console.log(`Entry found successfully: ID=${entry.id}, Status=${entry.status}`);
    
    // Check if the entry has an organization ID
    if (!entry.organization_id) {
      console.error(`Entry is missing organization_id: ${entry.id}`);
      return createErrorResponse(
        'Formulärkonfigurationen är ogiltig',
        'missing_org',
        500,
        'Saknar organisationsdata'
      );
    }
    
    console.log(`Entry has valid organization_id: ${entry.organization_id}`);
    
    // Check if the entry is expired
    if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
      console.log(`Token expired at ${entry.expires_at}`);
      return createErrorResponse(
        'Länken har gått ut',
        'expired',
        403,
        undefined,
        { status: 'expired' }
      );
    }
    
    // Check if the status is not 'sent' - patient can only fill forms in 'sent' status
    if (entry.status !== 'sent') {
      let message = 'Formuläret kan inte fyllas i för tillfället';
      let statusCode = 403;
      let errorCode = 'invalid_status';
      
      if (entry.status === 'pending' || entry.status === 'ready' || entry.status === 'reviewed') {
        message = 'Formuläret har redan fyllts i';
        statusCode = 400;
        errorCode = 'already_submitted';
      }
      
      console.log(`Invalid status for form submission: ${entry.status}`);
      return createErrorResponse(
        message,
        errorCode,
        statusCode,
        undefined,
        { status: entry.status }
      );
    }
    
    console.log(`Entry status is valid: ${entry.status}`);
    
    // Fetch form template
    console.log(`Fetching form template for organization: ${entry.organization_id}`);
    const { formTemplate, error: formError, notFound: formNotFound } = 
      await fetchFormTemplate(supabase, entry.organization_id);
    
    // Handle form template fetch errors
    if (formError) {
      console.error(`Error fetching form template:`, formError);
      return createErrorResponse(
        "Kunde inte ladda formuläret. Vänligen försök igen senare.",
        'form_error',
        500,
        formError.message
      );
    }
    
    if (formNotFound) {
      console.error(`No form template found for organization: ${entry.organization_id}`);
      return createErrorResponse(
        "Inget formulär hittades för denna organisation.",
        'missing_form',
        404
      );
    }
    
    console.log(`Form template found successfully: ${formTemplate.title}`);
    
    // Return successful response with entry and form template
    console.log('Token verification successful, returning data');
    return createSuccessResponse({ 
      entry, 
      formTemplate 
    });
  } catch (error) {
    // Handle unexpected errors
    return handleUnexpectedError(error as Error, FUNCTION_NAME);
  }
});

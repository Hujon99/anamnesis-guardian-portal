
/**
 * Submit Form Edge Function (v8)
 * 
 * This edge function handles the submission of patient form data.
 * It validates the token, checks form status, and stores patient answers
 * in a structured format based on the form template.
 * 
 * Updates in v8:
 * - Added support for optician-submitted forms
 * - Auto-updates status based on submitter role
 * - Preserves optician comments in answer structure
 * - Maintains backward compatibility
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
const FUNCTION_VERSION = "v8";
const FUNCTION_NAME = "submit-form";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Log function start with more details
    logFunctionStart(FUNCTION_NAME, FUNCTION_VERSION, req);
    console.log(`Request headers:`, Object.fromEntries([...req.headers.entries()]));
    
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
    
    // Parse request data
    let token, answers, formData, metadata;
    try {
      console.log(`Parsing request data...`);
      const requestData = await req.json();
      token = requestData.token;
      answers = requestData.answers;
      formData = requestData.formData;
      metadata = requestData.metadata || {};
      
      // Check for optician submission flag in answers._metadata
      const isOpticianSubmission = answers._metadata?.submittedBy === 'optician';
      const autoSetStatus = answers._metadata?.autoSetStatus;
      
      if (isOpticianSubmission) {
        console.log('Detected submission by optician');
        
        // Remove metadata from answers before processing
        if (answers._metadata) {
          delete answers._metadata;
        }
      }
      
      console.log(`Request data parsed successfully`);
      console.log(`Token: ${token ? token.substring(0, 6) + '...' : 'missing'}`);
      console.log(`Answers received: ${answers ? 'yes' : 'no'}`);
      console.log(`Form metadata received: ${formData ? 'yes' : 'no'}`);
      console.log(`Auto-set status: ${autoSetStatus || 'not specified'}`);
      
      // Log structure of answers for debugging
      if (answers) {
        console.log(`Answer structure: ${typeof answers === 'object' ? 
          (answers.formattedAnswers ? 'New structured format' : 'Legacy format') : 
          typeof answers}`);
      }
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
    console.log(`Validating token...`);
    const tokenValidation = validateToken(token);
    if (!tokenValidation.isValid) {
      console.error(`Token validation failed:`, tokenValidation.error);
      return createErrorResponse(
        tokenValidation.error!.message,
        tokenValidation.error!.code as any,
        400
      );
    }
    
    console.log(`Token validation successful`);
    
    // Validate answers
    if (!answers) {
      console.error(`Missing answers in request`);
      return createErrorResponse(
        'Svar är obligatoriska',
        'invalid_request',
        400
      );
    }
    
    // Set access token for RLS policies
    console.log(`Setting access token for RLS policies...`);
    try {
      await supabase.rpc('set_access_token', { token });
      console.log(`Access token set successfully for RLS policies`);
    } catch (rpcError) {
      console.error(`Failed to set access token for RLS:`, rpcError);
      // Continue execution, as this might not be critical depending on RLS setup
    }
    
    // Fetch the entry data
    console.log(`Fetching entry with token: ${token.substring(0, 6)}...`);
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
      console.error(`No entry found with token: ${token.substring(0, 6)}...`);
      return createErrorResponse(
        'Ogiltig länk',
        'invalid_token',
        404,
        'Ingen anamnes hittades med denna token'
      );
    }
    
    console.log(`Entry found successfully: ID=${entry.id}, Status=${entry.status}`);
    
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
    
    // Check for optician submission flag
    const isOpticianSubmission = answers._metadata?.submittedBy === 'optician';
    const autoSetStatus = answers._metadata?.autoSetStatus;
    
    // Remove metadata from answers before saving
    if (answers._metadata) {
      delete answers._metadata;
    }
    
    // Determine the new status based on submission type
    let newStatus = 'pending'; // Default status for patient submissions
    
    if (isOpticianSubmission) {
      // For optician submissions, use the specified status or default to 'ready'
      newStatus = autoSetStatus || 'ready';
      
      // If the answers object has a formattedAnswers property, set the isOpticianSubmission flag
      if (answers.formattedAnswers) {
        answers.formattedAnswers.isOpticianSubmission = true;
      }
    } else {
      // For patient submissions, verify entry status is 'sent'
      if (entry.status !== 'sent') {
        let message = 'Formuläret kan inte fyllas i för tillfället';
        
        if (entry.status === 'pending' || entry.status === 'ready' || entry.status === 'reviewed') {
          message = 'Formuläret har redan fyllts i';
        }
        
        console.log(`Invalid status for form submission: ${entry.status}`);
        return createErrorResponse(
          message,
          'invalid_status',
          400,
          undefined,
          { status: entry.status }
        );
      }
    }
    
    console.log(`Entry status will be set to: ${newStatus}`);
    
    // Ensure organization_id is preserved
    if (!entry.organization_id) {
      console.error(`Missing organization_id for entry: ${entry.id}`);
      return createErrorResponse(
        'Invalid form configuration',
        'missing_org',
        500,
        'Missing organization data'
      );
    }
    
    // Update the entry with answers
    console.log(`Updating entry ${entry.id} with answers and setting status to '${newStatus}'...`);
    const { data, error } = await supabase
      .from('anamnes_entries')
      .update({ 
        answers: answers,
        status: newStatus,
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
    
    console.log(`Entry ${entry.id} successfully updated with answers`);
    
    // Return successful response
    console.log('Form submission successful, returning updated entry data');
    return createSuccessResponse({ 
      entry: data,
      submissionType: isOpticianSubmission ? 'optician' : 'patient'
    });
  } catch (error) {
    // Handle unexpected errors
    return handleUnexpectedError(error as Error, FUNCTION_NAME);
  }
});

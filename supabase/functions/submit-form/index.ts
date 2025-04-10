/**
 * Submit Form Edge Function (v10 - Simplified)
 *
 * Handles submission of pre-formatted patient form data.
 * Validates token, checks status, stores formatted answers.
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
const FUNCTION_VERSION = "v10.0"; // Updated version
const FUNCTION_NAME = "submit-form";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  let token: string | null = null;
  let formattedAnswers: any = null; // Expecting the formatted structure directly

  try {
    logFunctionStart(FUNCTION_NAME, FUNCTION_VERSION, req);
    const supabase = createSupabaseClient();
    if (!supabase) return createErrorResponse('Konfigurationsfel', 'config_error', 500);

    console.log(`[${FUNCTION_NAME}]: Parsing request data...`);
    const requestData = await req.json();
    token = requestData.token;
    // *** CHANGE: Expect 'formattedAnswers' directly in the body ***
    formattedAnswers = requestData.formattedAnswers;

    console.log(`[${FUNCTION_NAME}]: Request data parsing complete`);
    console.log(`[${FUNCTION_NAME}]: Token: ${token ? token.substring(0, 6) + '...' : 'missing'}`);
    console.log(`[${FUNCTION_NAME}]: Received formattedAnswers structure:`,
        formattedAnswers ? `Title: ${formattedAnswers.formTitle}, Sections: ${formattedAnswers.answeredSections?.length ?? 0}` : 'missing');

    // Validate token and entry existence (similar logic as before)
    if (!token) return createErrorResponse('Token saknas', 'missing_token', 400);
    const { entry, error: validationError } = await validateToken(supabase, token);
    if (validationError) return validationError; // Returns error response directly
    if (!entry) return createErrorResponse('Ogiltigt eller utgånget token', 'invalid_token', 404); // Should be caught by validateToken, but double-check

    // Check if form is already completed (similar logic as before)
    if (entry.status === 'completed') {
      console.warn(`[${FUNCTION_NAME}]: Attempt to submit already completed form (Token: ${token.substring(0, 6)}...)`);
      return createErrorResponse('Formuläret är redan inskickat', 'already_completed', 409);
    }

    // Determine if it's an optician submission based on metadata within formattedAnswers
    let isOpticianSubmission = false;
    let autoSetStatus = 'ready'; // Default status for optician submissions
    let newStatus = 'pending'; // Default status for patient submissions

    // *** CHANGE: Check metadata within formattedAnswers ***
    if (formattedAnswers?._metadata?.submittedBy === 'optician') {
        console.log(`[${FUNCTION_NAME}]: Detected submission by optician (_metadata)`);
        isOpticianSubmission = true;
        autoSetStatus = formattedAnswers._metadata.autoSetStatus || 'ready';
        newStatus = autoSetStatus; // Use the status from metadata
    } else if (formattedAnswers?.isOpticianSubmission === true) {
        // Fallback check if the flag is still used directly
        console.log(`[${FUNCTION_NAME}]: Detected submission by optician (isOpticianSubmission flag)`);
        isOpticianSubmission = true;
        newStatus = autoSetStatus; // Use default 'ready'
    }

    if (!isOpticianSubmission && entry.status === 'pending') {
        newStatus = 'completed'; // Patient submitting sets to completed
        console.log(`[${FUNCTION_NAME}]: Patient submission detected, setting status to 'completed'`);
    } else {
        console.log(`[${FUNCTION_NAME}]: Optician submission detected or status not pending, setting status to '${newStatus}'`);
    }


    // *** CHANGE: Update the entry with formattedAnswers directly ***
    console.log(`[${FUNCTION_NAME}]: Updating entry ${entry.id} with formatted answers and setting status to '${newStatus}'...`);
    const { data, error: updateError } = await supabase
      .from('anamnes_entries')
      .update({
        // Save the received formattedAnswers object directly to the 'answers' column
        answers: formattedAnswers,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('access_token', token)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error(`[${FUNCTION_NAME}]: Error updating entry:`, updateError);
      return createErrorResponse('Misslyckades att spara svar', 'db_update_failed', 500, updateError.message);
    }

    console.log(`[${FUNCTION_NAME}]: Entry ${entry.id} successfully updated. Status: ${data?.status}`);

    return createSuccessResponse({
      entry: data,
      submissionType: isOpticianSubmission ? 'optician' : 'patient'
    });
  } catch (error) {
    return handleUnexpectedError(error as Error, FUNCTION_NAME);
  }
});

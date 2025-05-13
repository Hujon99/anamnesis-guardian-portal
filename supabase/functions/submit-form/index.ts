
/**
 * This Edge Function handles form submissions for anamnes entries.
 * It validates and processes the submitted form data, updating the entry status.
 * UNIFIED: Now handles both patient and optician submissions via the same endpoint.
 * Enhanced with better error handling, detailed logging, and input validation.
 * Sets the correct status to 'ready' for all completed submissions regardless of source.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSubmissionLogsTable } from "../utils/databaseFunctions.ts";
import { corsHeaders } from './corsHeaders.ts';
import { createLogger } from './logger.ts';
import { createErrorHandler } from './errorHandler.ts';
import { createTokenValidator } from './tokenValidation.ts';
import { createDataFormatter } from './dataFormatting.ts';
import { createDatabaseOperations } from './databaseOperations.ts';
import { SuccessResponse } from './types.ts';

// Create main service objects
const mainLogger = createLogger('main');
const errorHandler = createErrorHandler(mainLogger);
const tokenValidator = createTokenValidator(mainLogger);
const dataFormatter = createDataFormatter(mainLogger);
const dbOperations = createDatabaseOperations(mainLogger);

// Ensure submission logs table exists
async function ensureSubmissionLogsTableExists() {
  try {
    const result = await createSubmissionLogsTable();
    if (result) {
      mainLogger.info("Submission logs table exists or was created successfully");
    } else {
      mainLogger.error("Failed to create submission logs table");
    }
    return result;
  } catch (error) {
    mainLogger.error("Error checking/creating submission logs table:", error);
    return false;
  }
}

// Trigger AI summary generation in background
async function backgroundSummaryGeneration(entryId: string) {
  try {
    mainLogger.info(`Running background AI summary generation for entry ${entryId}`);
    await dbOperations.triggerAiSummary(entryId);
    mainLogger.info(`Background AI summary generation completed for ${entryId}`);
  } catch (error) {
    mainLogger.error(`Background AI summary generation failed for ${entryId}:`, error);
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    mainLogger.info("Handling OPTIONS request (CORS preflight)");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    mainLogger.info("Received form submission request");
    
    // Create the submission logs table if it doesn't exist yet
    await ensureSubmissionLogsTableExists();
    
    // Log the headers for debugging CORS issues
    const headersList = {};
    req.headers.forEach((value, key) => {
      headersList[key] = value;
    });
    mainLogger.debug("Request headers:", headersList);
    
    // Parse the request body
    let requestData;
    try {
      requestData = await req.json();
      mainLogger.info("Request body parsed successfully");
    } catch (parseError) {
      mainLogger.error("Error parsing request body:", parseError);
      return errorHandler.validationError('Invalid JSON payload', parseError.message);
    }
    
    // Enhanced debugging: log the request structure (excluding sensitive data)
    mainLogger.debug("Request structure:", {
      hasToken: !!requestData?.token,
      tokenType: typeof requestData?.token,
      tokenLength: requestData?.token?.length,
      hasAnswers: !!requestData?.answers,
      answersType: typeof requestData?.answers,
      hasRawAnswers: !!requestData?.answers?.rawAnswers,
      rawAnswersType: typeof requestData?.answers?.rawAnswers,
      hasFormattedAnswers: !!requestData?.answers?.formattedAnswers,
      formattedAnswersType: typeof requestData?.answers?.formattedAnswers,
      hasMetadata: !!requestData?.answers?.metadata,
      isOptician: !!requestData?.answers?._isOptician || !!requestData?.answers?._metadata?.submittedBy === 'optician',
    });
    
    // *** Step 1: Validate submission data (token and answers) ***
    const validationResult = tokenValidator.validateSubmissionData(requestData);
    
    if (!validationResult.success) {
      return errorHandler.validationError(
        validationResult.error || 'Invalid submission data',
        validationResult.errorDetails
      );
    }
    
    const { token, answers, isOptician } = validationResult.data;
    
    // Update logger with submission info
    mainLogger.setToken(token).setSubmissionType(isOptician);
    
    // *** Step 2: Set access token for RLS policies ***
    mainLogger.info("Setting access token in database session...");
    const tokenSetResult = await dbOperations.setAccessToken(token);
    
    if (!tokenSetResult.success) {
      mainLogger.warn("Failed to set access token, but will continue with admin client");
    }
    
    // *** Step 3: Fetch entry by token ***
    mainLogger.info("Fetching entry by token...");
    const entryResult = await dbOperations.getEntryByToken(token);
    
    if (!entryResult.success) {
      return errorHandler.authenticationError(
        entryResult.error || 'Invalid token',
        entryResult.errorDetails
      );
    }
    
    const entry = entryResult.data;
    
    // Update logger with entry info
    mainLogger.setEntry(entry);
    
    mainLogger.info(`Found entry ${entry.id}, status: ${entry.status}, is_magic_link: ${entry.is_magic_link}, form_id: ${entry.form_id}`);
    
    // *** Step 4: Validate if entry can be updated based on status ***
    const statusValidationResult = tokenValidator.validateEntryStatus(entry.status, isOptician);
    
    if (!statusValidationResult.success && statusValidationResult.data === true) {
      // Form was already submitted, return a success response
      const response: SuccessResponse = { 
        success: true, 
        message: 'Form was already submitted',
        submitted: true
      };
      
      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // *** Step 5: Fetch the form template to use for better formatting ***
    mainLogger.info(`Fetching form template with ID: ${entry.form_id}`);
    const templateResult = await dbOperations.getFormTemplate(entry.form_id);
    const formTemplate = templateResult.success ? templateResult.data : null;
    
    if (!formTemplate) {
      mainLogger.warn(`Couldn't fetch form template: ${templateResult.error}`);
    }
    
    // *** Step 6: Prepare data for database update ***
    try {
      // Extract form data
      const formData = dataFormatter.extractFormData(answers);
      
      // Generate formatted raw data
      let formattedRawData;
      
      // Try to use provided formatted data first
      if (typeof answers.formattedRawData === 'string' && answers.formattedRawData.trim() !== '') {
        mainLogger.info("Using provided formattedRawData string");
        formattedRawData = answers.formattedRawData;
      } else if (answers.formatted_raw_data) {
        mainLogger.info("Using provided formatted_raw_data");
        formattedRawData = answers.formatted_raw_data;
      } else {
        mainLogger.info("Generating formatted raw data");
        
        // Try to extract formatted answers structure
        const formattedAnswersObj = dataFormatter.extractFormattedAnswers(answers);
        
        if (formTemplate && formattedAnswersObj) {
          // Use the optimized algorithm with the form template
          formattedRawData = dataFormatter.createOptimizedPromptInput(formTemplate, formattedAnswersObj);
          mainLogger.info("Generated formatted raw data using template and answers");
        } else {
          mainLogger.info("Using fallback simple text formatting");
          // Fallback to simple formatting
          formattedRawData = "Patientens anamnesinformation:\n\n";
          if (typeof formData === 'object' && formData !== null) {
            Object.entries(formData).forEach(([key, value]) => {
              if (key !== 'metadata' && key !== 'formattedAnswers' && value !== null && value !== undefined) {
                formattedRawData += `${key}: ${JSON.stringify(value)}\n`;
              }
            });
          }
        }
      }
      
      // Set status to 'ready' regardless of submission type (patient or optician)
      const status = 'ready';
      mainLogger.info(`Setting status to '${status}' for all completed submissions`);
      
      // Prepare the update data
      const updateData = dataFormatter.prepareUpdateData(formData, formattedRawData, status);
      
      // Log the update data preview
      mainLogger.debug("Update data prepared:", {
        answersKeysCount: Object.keys(updateData.answers).length,
        formattedRawDataLength: updateData.formatted_raw_data.length,
        status: updateData.status
      });
      
      // *** Step 7: Update the entry with submitted data ***
      mainLogger.info(`Updating entry ${entry.id} with submitted data...`);
      const updateResult = await dbOperations.updateEntry(entry.id, updateData);
      
      if (!updateResult.success) {
        return errorHandler.databaseError(
          updateResult.error || 'Failed to save form data',
          updateResult.errorDetails
        );
      }
      
      // *** Step 8: Try to generate AI summary in background ***
      mainLogger.info("Attempting to trigger AI summary generation in background...");
      
      try {
        // Use EdgeRuntime.waitUntil for background processing
        if (typeof EdgeRuntime !== 'undefined') {
          mainLogger.info("Using EdgeRuntime.waitUntil for background processing");
          EdgeRuntime.waitUntil(backgroundSummaryGeneration(entry.id));
        } else {
          mainLogger.info("EdgeRuntime not available, attempting direct summary generation");
          // Don't wait for the result
          dbOperations.triggerAiSummary(entry.id)
            .catch(e => mainLogger.error("Direct AI summary generation failed:", e));
        }
      } catch (aiError) {
        // Log the error but don't fail the submission
        mainLogger.error("Error initiating AI summary generation:", aiError);
      }
      
      // *** Step 9: Return success response ***
      const response: SuccessResponse = { 
        success: true, 
        message: 'Form successfully submitted',
        submitted: true
      };
      
      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      mainLogger.error("Error preparing or submitting data:", error);
      return errorHandler.serverError(
        'Failed to process form data', 
        error instanceof Error ? error.message : String(error)
      );
    }
  } catch (error) {
    // Handle unexpected errors
    mainLogger.error("Unexpected error:", error);
    
    return errorHandler.serverError(
      'Server error', 
      error instanceof Error ? error.message : String(error)
    );
  }
});

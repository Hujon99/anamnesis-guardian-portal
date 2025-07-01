
/**
 * Submit Form Edge Function
 * Handles form submissions for both patient and optician modes with comprehensive error handling,
 * token validation, and database operations. Integrates with AI summary generation and 
 * provides detailed logging for debugging purposes.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "./corsHeaders.ts";
import { DatabaseOperations } from "./databaseOperations.ts";
import { Logger } from "./logger.ts";

// Simple error response function to avoid import complications
const createErrorResponse = (message: string, status = 400) => {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
};

// Initialize Supabase client for internal function calls
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const logger = new Logger('submit-form');
  
  try {
    const requestBody = await req.json();
    const { token, ...formData } = requestBody;

    if (!token) {
      return createErrorResponse('Form token is missing', 400);
    }

    logger.info(`Processing form submission for token: ${token.substring(0, 6)}...`);
    
    // Initialize database operations
    const dbOps = new DatabaseOperations(logger);
    
    // Set access token for RLS policies
    const setTokenResult = await dbOps.setAccessToken(token);
    if (!setTokenResult.success) {
      logger.error("Failed to set access token:", setTokenResult.error);
      return createErrorResponse("Authentication failed", 401);
    }

    // Get entry by token
    const entryResult = await dbOps.getEntryByToken(token);
    if (!entryResult.success || !entryResult.data) {
      logger.error("Failed to get entry by token:", entryResult.error);
      const statusCode = entryResult.errorCode === "not_found" ? 404 : 500;
      return createErrorResponse(entryResult.error || "Entry not found", statusCode);
    }

    const entry = entryResult.data;
    logger.info(`Found entry: ${entry.id}, current status: ${entry.status}`);

    // Check if form was already submitted
    if (entry.status === 'ready') {
      logger.info("Form was already submitted, returning success");
      
      // Still trigger AI summary if not done yet
      if (entry.id) {
        try {
          const { error: summaryError } = await supabase.functions.invoke('generate-summary', {
            body: { entryId: entry.id }
          });
          
          if (summaryError) {
            logger.error(`Failed to generate AI summary: ${summaryError.message}`);
          } else {
            logger.info(`AI summary generation triggered successfully`);
          }
        } catch (summaryError) {
          logger.error(`Error triggering AI summary generation:`, summaryError);
        }
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Formuläret har redan skickats in",
          entryId: entry.id
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Determine if this is an optician submission
    const isOptician = formData._isOptician === true || 
                      formData._metadata?.submittedBy === 'optician';

    // Prepare update data
    const updateData = {
      answers: formData,
      formatted_raw_data: JSON.stringify(formData, null, 2),
      status: 'ready', // Both patients and opticians set to 'ready'
      updated_at: new Date().toISOString()
    };

    // Update the entry
    const updateResult = await dbOps.updateEntry(entry.id, updateData);
    if (!updateResult.success) {
      logger.error("Failed to update entry:", updateResult.error);
      const statusCode = updateResult.errorCode === "database_error" ? 500 : 400;
      return createErrorResponse(updateResult.error || "Failed to save form data", statusCode);
    }

    logger.info(`Form submission completed successfully for entry: ${entry.id}`);

    // After successful submission, trigger AI summary generation
    try {
      const { error: summaryError } = await supabase.functions.invoke('generate-summary', {
        body: { entryId: entry.id }
      });
      
      if (summaryError) {
        logger.error(`Failed to generate AI summary: ${summaryError.message}`);
        // Don't fail the submission if summary generation fails
      } else {
        logger.info(`AI summary generation triggered successfully`);
      }
    } catch (summaryError) {
      logger.error(`Error triggering AI summary generation:`, summaryError);
      // Don't fail the submission if summary generation fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Formuläret har skickats in framgångsrikt",
        entryId: entry.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[submit-form] Unexpected error:', error);
    return createErrorResponse(
      'Ett oväntat fel uppstod vid bearbetning av formuläret',
      500
    );
  }
});

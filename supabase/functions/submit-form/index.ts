
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
import { DataFormatter } from "./dataFormatting.ts";
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
    
    // Initialize database operations and data formatter
    const dbOps = new DatabaseOperations(logger);
    const dataFormatter = new DataFormatter(logger);
    
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

    // Extract the actual form data
    const extractedFormData = dataFormatter.extractFormData(formData);
    
    // Get form template for proper formatting
    let formTemplate = null;
    let formattedRawData = '';
    
    if (entry.form_id) {
      logger.info(`Fetching form template for form_id: ${entry.form_id}`);
      const templateResult = await dbOps.getFormTemplate(entry.form_id);
      
      if (templateResult.success && templateResult.data) {
        formTemplate = templateResult.data;
        logger.info("Form template fetched successfully");
        
        // Extract formatted answers from the submitted data
        const formattedAnswers = dataFormatter.extractFormattedAnswers(extractedFormData);
        
        if (formattedAnswers && formTemplate) {
          // Create optimized formatted text using the same logic as frontend
          formattedRawData = dataFormatter.createOptimizedPromptInput(formTemplate, formattedAnswers);
          logger.info("Successfully created optimized formatted text");
        } else {
          logger.warn("Could not extract formatted answers or missing template, using fallback formatting");
          formattedRawData = JSON.stringify(extractedFormData, null, 2);
        }
      } else {
        logger.warn("Could not fetch form template, using basic formatting");
        formattedRawData = JSON.stringify(extractedFormData, null, 2);
      }
    } else {
      logger.warn("No form_id available, using basic formatting");
      formattedRawData = JSON.stringify(extractedFormData, null, 2);
    }

    // Prepare update data with properly formatted text
    const examinationType = entry.anamnes_forms?.examination_type;
    const updateData = dataFormatter.prepareUpdateData(
      extractedFormData,
      formattedRawData,
      'ready',
      examinationType
    );

    logger.info("Prepared update data with formatted text");

    // Update the entry
    const updateResult = await dbOps.updateEntry(entry.id, updateData);
    if (!updateResult.success) {
      logger.error("Failed to update entry:", updateResult.error);
      const statusCode = updateResult.errorCode === "database_error" ? 500 : 400;
      return createErrorResponse(updateResult.error || "Failed to save form data", statusCode);
    }

    logger.info(`Form submission completed successfully for entry: ${entry.id}`);

    // Capture anonymized client info and log access
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

    try {
      const clientIp = getClientIp(req.headers);
      const anonymizedIp = anonymizeIP(clientIp);
      const userAgent = req.headers.get('user-agent') || null;
      const { error: accessLogError } = await supabase.from('audit_data_access').insert([
        {
          user_id: 'anonymous',
          organization_id: entry.organization_id,
          table_name: 'anamnes_entries',
          record_id: String(entry.id),
          action_type: 'submit',
          purpose: 'form_submission',
          route: 'edge:submit-form',
          ip_address_anonymized: anonymizedIp,
          user_agent: userAgent,
        },
      ]);
      if (accessLogError) {
        logger.warn('Failed to insert anonymized access log', accessLogError);
      } else {
        logger.info('Anonymized access log inserted');
      }
    } catch (logErr) {
      logger.warn('Error while logging anonymized access', logErr);
    }

    // After successful submission with formatted data, trigger AI summary generation
    try {
      logger.info("Triggering AI summary generation with formatted data");
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


/**
 * This Edge Function handles form submissions for anamnes entries.
 * It validates and processes the submitted form data, updating the entry status.
 * Enhanced to handle both regular and magic link entries.
 * Improved with better error handling, detailed logging, and input validation.
 * Modified to use a consistent approach for both patient and optician submissions.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[submit-form]: Received form submission request");
    
    // Parse the request body
    let requestData;
    try {
      requestData = await req.json();
      console.log("[submit-form]: Request body parsed successfully");
    } catch (parseError) {
      console.error("[submit-form]: Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload', details: parseError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Enhanced debugging: log the entire request structure (excluding sensitive data)
    console.log("[submit-form]: Request structure:", JSON.stringify({
      hasToken: !!requestData?.token,
      tokenType: typeof requestData?.token,
      tokenLength: requestData?.token?.length,
      hasAnswers: !!requestData?.answers,
      answersType: typeof requestData?.answers,
      answersKeys: typeof requestData?.answers === 'object' ? Object.keys(requestData?.answers) : [],
      hasFormattedRawData: !!requestData?.answers?.formatted_raw_data,
      formattedRawDataType: typeof requestData?.answers?.formatted_raw_data,
      formattedRawDataLength: requestData?.answers?.formatted_raw_data?.length || 0,
      // Additional logging for rawAnswers path
      hasRawAnswers: !!requestData?.answers?.rawAnswers,
      rawAnswersKeys: requestData?.answers?.rawAnswers ? Object.keys(requestData?.answers?.rawAnswers) : [],
      // Log all top-level keys for better diagnostics
      topLevelKeys: Object.keys(requestData || {}),
      answerTopLevelKeys: requestData?.answers ? Object.keys(requestData.answers) : []
    }, null, 2));
    
    // Extract necessary data
    const { token, answers } = requestData;
    
    // Validate token
    if (!token) {
      console.error("[submit-form]: Missing token parameter");
      return new Response(
        JSON.stringify({ error: 'Missing token parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Basic token validation
    if (typeof token !== 'string' || token.length < 10) {
      console.error("[submit-form]: Invalid token format");
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate answers
    if (!answers) {
      console.error("[submit-form]: Missing form data");
      return new Response(
        JSON.stringify({ error: 'Missing form data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log("[submit-form]: Form submission received for token:", token.substring(0, 6) + "...");
    
    // Initialize the Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    
    // 1. Fetch the entry by token to get its ID and check its status
    console.log("[submit-form]: Fetching entry by token...");
    const { data: entry, error: entryError } = await supabase
      .from('anamnes_entries')
      .select('id, status, is_magic_link, booking_id')
      .eq('access_token', token)
      .maybeSingle();
    
    if (entryError) {
      console.error("[submit-form]: Error fetching entry:", entryError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch entry', details: entryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!entry) {
      console.error("[submit-form]: No entry found with token:", token.substring(0, 6) + "...");
      return new Response(
        JSON.stringify({ error: 'Invalid token, no entry found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[submit-form]: Found entry ${entry.id}, status: ${entry.status}, is_magic_link: ${entry.is_magic_link}`);
    
    // If the form was already submitted, return a success response
    if (entry.status === 'submitted') {
      console.log("[submit-form]: Form was already submitted, returning success");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Form was already submitted',
          submitted: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Prepare data for database update - SIMPLIFIED APPROACH
    let updateData;
    
    try {
      // SIMPLIFIED DATA EXTRACTION - Use a more direct approach
      console.log("[submit-form]: Preparing update data with simplified approach");
      
      // Get the form answers - either from direct answers object or from rawAnswers
      let formAnswers = answers;
      if (answers.rawAnswers && typeof answers.rawAnswers === 'object') {
        console.log("[submit-form]: Using rawAnswers from payload");
        formAnswers = answers.rawAnswers;
      }
      
      // Get formatted_raw_data - prioritize it wherever it might be
      let formattedRawData = null;
      
      // Check all possible locations for formatted_raw_data
      if (typeof answers.formatted_raw_data === 'string' && answers.formatted_raw_data.trim() !== '') {
        console.log("[submit-form]: Found formatted_raw_data directly in answers");
        formattedRawData = answers.formatted_raw_data;
      } else if (typeof answers.formattedRawData === 'string' && answers.formattedRawData.trim() !== '') {
        console.log("[submit-form]: Found formattedRawData directly in answers");
        formattedRawData = answers.formattedRawData;
      } else if (answers.rawAnswers?.formatted_raw_data) {
        console.log("[submit-form]: Found formatted_raw_data in rawAnswers");
        formattedRawData = answers.rawAnswers.formatted_raw_data;
      } else if (answers.rawAnswers?.formattedRawData) {
        console.log("[submit-form]: Found formattedRawData in rawAnswers");
        formattedRawData = answers.rawAnswers.formattedRawData;
      }
      
      // Log what we found
      if (formattedRawData) {
        console.log("[submit-form]: Successfully extracted formatted raw data, length:", 
                   formattedRawData.length);
        console.log("[submit-form]: Sample of formatted raw data:", 
                   formattedRawData.substring(0, 100) + "...");
      } else {
        console.warn("[submit-form]: No formatted raw data found in any location");
        
        // Create a simple fallback if formatted data is missing
        formattedRawData = "Patientens anamnesinformation:\n\n";
        if (typeof formAnswers === 'object' && formAnswers !== null) {
          Object.entries(formAnswers)
            .filter(([key]) => !['metadata', 'formattedAnswers', '_metadata'].includes(key))
            .forEach(([key, value]) => {
              if (value !== null && value !== undefined && value !== '') {
                formattedRawData += `${key}: ${JSON.stringify(value)}\n`;
              }
            });
        }
        console.log("[submit-form]: Created fallback formatted raw data");
      }
      
      // Construct the final update data - SIMPLIFIED
      updateData = {
        // Use the form answers directly
        answers: formAnswers,
        // Always set formatted_raw_data (database field name)
        formatted_raw_data: formattedRawData,
        // Set status to submitted
        status: 'submitted',
        // Update timestamp
        updated_at: new Date().toISOString()
      };
      
      console.log("[submit-form]: Final update data structure:", {
        hasAnswers: !!updateData.answers,
        answersFieldCount: Object.keys(updateData.answers || {}).length,
        hasFormattedRawData: !!updateData.formatted_raw_data,
        formattedRawDataLength: updateData.formatted_raw_data?.length || 0,
        status: updateData.status
      });
      
    } catch (dataError) {
      console.error("[submit-form]: Error preparing update data:", dataError);
      return new Response(
        JSON.stringify({ error: 'Failed to process form data', details: dataError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // 2. Update the entry with the submitted data
    console.log("[submit-form]: Updating entry with submitted data...");
    console.log("[submit-form]: Entry ID:", entry.id);
    
    // Attempt to update with transaction for better atomicity
    try {
      // Log sample of data we're about to insert
      const sampleData = {
        answersSample: JSON.stringify(updateData.answers).substring(0, 200) + '...',
        formattedRawDataSample: updateData.formatted_raw_data.substring(0, 200) + '...',
        status: updateData.status
      };
      console.log("[submit-form]: Sample of data being inserted:", sampleData);
      
      const { data: updateResult, error: updateError } = await supabase
        .from('anamnes_entries')
        .update(updateData)
        .eq('id', entry.id)
        .select('id, status')
        .single();
      
      if (updateError) {
        console.error("[submit-form]: Error updating entry:", updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to save entry', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log("[submit-form]: Entry updated successfully:", JSON.stringify(updateResult));
    } catch (updateCatchError) {
      console.error("[submit-form]: Exception during update operation:", updateCatchError);
      return new Response(
        JSON.stringify({ error: 'Exception during database update', details: updateCatchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // 3. Log additional information for magic link entries
    if (entry.is_magic_link) {
      console.log(`[submit-form]: Magic link submission successful for booking ID: ${entry.booking_id}`);
    }
    
    // 4. Trigger background summary generation if configured
    try {
      console.log("[submit-form]: Triggering generate-summary function...");
      await supabase.functions.invoke('generate-summary', {
        body: { entryId: entry.id }
      });
      console.log("[submit-form]: Summary generation triggered successfully");
    } catch (summaryError) {
      console.error("[submit-form]: Error triggering summary generation:", summaryError);
      // Non-critical error, continue with submission success
    }
    
    // 5. Perform a verification read to confirm the data was saved
    try {
      const { data: verifyData, error: verifyError } = await supabase
        .from('anamnes_entries')
        .select('id, status, answers, formatted_raw_data')
        .eq('id', entry.id)
        .single();
        
      if (verifyError) {
        console.error("[submit-form]: Verification read failed:", verifyError);
      } else {
        console.log("[submit-form]: Verification read successful:", JSON.stringify({
          id: verifyData.id,
          status: verifyData.status,
          hasAnswers: !!verifyData.answers,
          answersSize: verifyData.answers ? Object.keys(verifyData.answers).length : 0,
          hasFormattedRawData: !!verifyData.formatted_raw_data,
          formattedRawDataLength: verifyData.formatted_raw_data ? verifyData.formatted_raw_data.length : 0
        }));
      }
    } catch (verifyException) {
      console.error("[submit-form]: Exception during verification read:", verifyException);
    }
    
    // Return success response
    console.log("[submit-form]: Form submission process completed successfully");
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Form submitted successfully',
        entryId: entry.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("[submit-form]: Unexpected error:", error);
    
    return new Response(
      JSON.stringify({ error: 'Server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

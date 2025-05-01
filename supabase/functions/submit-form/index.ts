
/**
 * This Edge Function handles form submissions for anamnes entries.
 * It validates and processes the submitted form data, updating the entry status.
 * Enhanced to handle both regular and magic link entries.
 * Improved with better error handling, detailed logging, and input validation.
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
      hasRawAnswers: !!requestData?.answers?.rawAnswers,
      rawAnswersType: typeof requestData?.answers?.rawAnswers,
      hasFormattedAnswers: !!requestData?.answers?.formattedAnswers,
      formattedAnswersType: typeof requestData?.answers?.formattedAnswers,
      hasMetadata: !!requestData?.answers?.metadata,
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
    
    // Prepare data for database update
    let updateData;
    
    try {
      // Enhanced answer extraction and validation
      console.log("[submit-form]: Data inspection and validation");
      console.log("[submit-form]: Answers type:", typeof answers);
      console.log("[submit-form]: Answers structure:", {
        isObject: typeof answers === 'object',
        hasRawAnswers: !!answers.rawAnswers,
        rawAnswersType: typeof answers.rawAnswers,
        hasFormattedAnswers: !!answers.formattedAnswers,
        formattedAnswersType: typeof answers.formattedAnswers,
        hasAnswersProperty: !!answers.answers,
        answersPropertyType: typeof answers.answers,
        directAnswersKeys: typeof answers === 'object' ? Object.keys(answers) : []
      });
      
      // Extract form data using safer access patterns with detailed validation
      let formData;
      
      // Handle different possible structures with more explicit validation
      if (answers.rawAnswers) {
        console.log("[submit-form]: Using rawAnswers property");
        formData = answers.rawAnswers;
      } else if (answers.answers) {
        console.log("[submit-form]: Using answers property");
        formData = answers.answers;
      } else if (typeof answers === 'object' && !Array.isArray(answers)) {
        console.log("[submit-form]: Using answers object directly");
        // Filter out special properties that aren't actual form answers
        formData = {};
        for (const key in answers) {
          if (key !== 'metadata' && key !== 'formattedAnswers' && key !== 'rawAnswers') {
            formData[key] = answers[key];
          }
        }
      } else {
        console.error("[submit-form]: Could not determine valid answer structure");
        throw new Error("Invalid answer structure in submission");
      }
      
      // Verify we have valid form data after extraction
      if (!formData || (typeof formData === 'object' && Object.keys(formData).length === 0)) {
        console.error("[submit-form]: Form data is empty after extraction");
        throw new Error("No valid form data found in submission");
      }
      
      console.log("[submit-form]: Form data structure after extraction:", {
        dataType: typeof formData,
        isObject: typeof formData === 'object',
        hasKeys: typeof formData === 'object' ? Object.keys(formData).length : 0,
        sampleKeys: typeof formData === 'object' ? Object.keys(formData).slice(0, 3) : [],
        sampleData: typeof formData === 'object' ? JSON.stringify(formData).substring(0, 100) + '...' : String(formData).substring(0, 100)
      });
      
      // Prepare the raw data to store
      const rawData = {
        answers: formData,
        meta: {
          submitted_at: new Date().toISOString(),
          form_template_id: answers.metadata?.formTemplateId || null
        }
      };
      
      console.log("[submit-form]: Raw data prepared:", JSON.stringify({
        hasAnswers: !!rawData.answers,
        answerKeys: typeof rawData.answers === 'object' ? Object.keys(rawData.answers).length : 0,
        hasMeta: !!rawData.meta
      }));
      
      // Use either the formatted answers (if provided) or stringify the raw data
      let formattedRawData;
      if (answers.formattedAnswers) {
        console.log("[submit-form]: Using provided formattedAnswers");
        if (typeof answers.formattedAnswers === 'string') {
          formattedRawData = answers.formattedAnswers;
        } else {
          formattedRawData = JSON.stringify(answers.formattedAnswers);
        }
      } else {
        console.log("[submit-form]: Creating formattedRawData from raw data");
        formattedRawData = JSON.stringify(rawData);
      }
      
      // Final validation check
      if (!formattedRawData || formattedRawData === '{}' || formattedRawData === 'null') {
        console.error("[submit-form]: Formatted raw data is empty or invalid");
        throw new Error("Formatted data is empty or invalid");
      }
      
      // Verify we have a non-empty object for answers
      if (typeof formData !== 'object' || Array.isArray(formData) || Object.keys(formData).length === 0) {
        console.error("[submit-form]: Form data is not a valid non-empty object", formData);
        throw new Error("Form data must be a non-empty object");
      }
        
      // Prepare the update data
      updateData = { 
        answers: formData,
        formatted_raw_data: formattedRawData,
        status: 'submitted',
        updated_at: new Date().toISOString()
      };
      
      console.log("[submit-form]: Update data prepared successfully:", JSON.stringify({
        hasAnswers: !!updateData.answers,
        answersType: typeof updateData.answers,
        answersIsArray: Array.isArray(updateData.answers),
        answersKeyCount: Object.keys(updateData.answers).length,
        hasFormattedData: !!updateData.formatted_raw_data,
        formattedDataLength: updateData.formatted_raw_data?.length,
        status: updateData.status
      }));
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
    console.log("[submit-form]: Update data structure validation:",
      "answers is " + (updateData.answers ? "present" : "missing"),
      "answers has " + Object.keys(updateData.answers).length + " keys",
      "formatted_raw_data is " + (updateData.formatted_raw_data ? `present (${updateData.formatted_raw_data.substring(0, 50)}...)` : "missing")
    );
    
    // Attempt to update with transaction for better atomicity
    try {
      // Log sample of data we're about to insert
      const sampleData = {
        answersSample: JSON.stringify(updateData.answers).substring(0, 200) + '...',
        formattedRawDataSample: updateData.formatted_raw_data.substring(0, 200) + '...',
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
        .select('id, status, answers')
        .eq('id', entry.id)
        .single();
        
      if (verifyError) {
        console.error("[submit-form]: Verification read failed:", verifyError);
      } else {
        console.log("[submit-form]: Verification read successful:", JSON.stringify({
          id: verifyData.id,
          status: verifyData.status,
          hasAnswers: !!verifyData.answers,
          answersSize: verifyData.answers ? Object.keys(verifyData.answers).length : 0
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

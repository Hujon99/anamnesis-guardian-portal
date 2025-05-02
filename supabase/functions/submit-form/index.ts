
/**
 * This Edge Function handles form submissions for anamnes entries.
 * It validates and processes the submitted form data, updating the entry status.
 * Simplified to use a consistent data structure for both patient and optician submissions.
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
  // Better request logging
  console.log("[submit-form]: REQUEST RECEIVED", {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries([...req.headers.entries()]),
  });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("[submit-form]: Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[submit-form]: Processing form submission request");
    
    // Parse the request body with detailed error handling
    let requestData;
    try {
      const text = await req.text();
      console.log("[submit-form]: Raw request body:", text.substring(0, 200) + (text.length > 200 ? "..." : ""));
      
      try {
        requestData = JSON.parse(text);
        console.log("[submit-form]: Request body parsed successfully");
      } catch (jsonError) {
        console.error("[submit-form]: JSON parse error:", jsonError);
        return new Response(
          JSON.stringify({ error: 'Invalid JSON payload', details: jsonError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (parseError) {
      console.error("[submit-form]: Error reading request body:", parseError);
      return new Response(
        JSON.stringify({ error: 'Failed to read request body', details: parseError.message }),
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
      topLevelKeys: Object.keys(requestData || {})
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
    console.log("[submit-form]: Initializing Supabase client with URL:", supabaseUrl.substring(0, 20) + "...");
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
    if (entry.status === 'submitted' || entry.status === 'ready') {
      console.log("[submit-form]: Form was already submitted with status:", entry.status);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Form was already submitted',
          submitted: true,
          status: entry.status
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // SIMPLIFIED: Just use the answers object directly with minimal processing
    const updateData = {
      // Use the answers object directly, which should already contain formatted_raw_data
      ...answers,
      
      // Make sure status is set correctly - this value might be overridden if it's already in answers
      status: answers.status || 'submitted',
      
      // Always update timestamp
      updated_at: new Date().toISOString()
    };
    
    // Log what we're about to update with
    console.log("[submit-form]: Update data structure:", {
      hasAnswers: true, 
      topLevelKeys: Object.keys(updateData),
      hasFormattedRawData: !!updateData.formatted_raw_data,
      formattedRawDataLength: updateData.formatted_raw_data?.length || 0,
      status: updateData.status
    });
    
    // 2. Update the entry with the submitted data
    console.log("[submit-form]: Updating entry with submitted data...");
    console.log("[submit-form]: Entry ID:", entry.id);
    
    // Attempt to update with transaction for better atomicity
    try {
      // Log sample of data we're about to insert
      const sampleData = {
        updateDataSample: JSON.stringify(updateData).substring(0, 200) + '...',
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
        .select('id, status, formatted_raw_data')
        .eq('id', entry.id)
        .single();
        
      if (verifyError) {
        console.error("[submit-form]: Verification read failed:", verifyError);
      } else {
        console.log("[submit-form]: Verification read successful:", JSON.stringify({
          id: verifyData.id,
          status: verifyData.status,
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

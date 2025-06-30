import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "./corsHeaders.ts";
import { createErrorResponse } from "./errorHandler.ts";
import { processFormSubmission } from "./databaseOperations.ts";

// Initialize Supabase client for internal function calls
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, ...formData } = await req.json();

    if (!token) {
      return createErrorResponse('Form token is missing', 400);
    }

    // Parse and validate form data
    console.log(`[submit-form] Processing form submission for token: ${token}`);
    
    const result = await processFormSubmission(token, formData);
    
    if (!result.success) {
      return createErrorResponse(result.error, result.statusCode || 500);
    }

    console.log(`[submit-form] Form submission successful for entry: ${result.entryId}`);

    // After successful submission, trigger AI summary generation
    if (result.entryId) {
      console.log(`[submit-form] Triggering AI summary generation for entry: ${result.entryId}`);
      
      try {
        // Call the generate-summary function with the entry ID
        const { error: summaryError } = await supabase.functions.invoke('generate-summary', {
          body: { entryId: result.entryId }
        });
        
        if (summaryError) {
          console.error(`[submit-form] Failed to generate AI summary: ${summaryError.message}`);
          // Don't fail the submission if summary generation fails
        } else {
          console.log(`[submit-form] AI summary generation triggered successfully`);
        }
      } catch (summaryError) {
        console.error(`[submit-form] Error triggering AI summary generation:`, summaryError);
        // Don't fail the submission if summary generation fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Formuläret har skickats in framgångsrikt",
        entryId: result.entryId
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

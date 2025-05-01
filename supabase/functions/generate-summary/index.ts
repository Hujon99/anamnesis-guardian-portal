
/**
 * This Edge Function generates AI summaries of anamnesis entries.
 * It can be triggered directly with prompt text or with an entry ID to fetch data from the database.
 * It uses Azure OpenAI to provide structured summaries of patient information.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Set up environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const azureOpenAIKey = Deno.env.get('AZURE_OPENAI_API_KEY') || '';
const azureOpenAIBaseEndpoint = Deno.env.get('AZURE_OPENAI_BASE_ENDPOINT') || '';
const azureOpenAIDeploymentName = Deno.env.get('AZURE_OPENAI_DEPLOYMENT_NAME') || '';

// Azure OpenAI API endpoint
const apiUrl = `${azureOpenAIBaseEndpoint}/openai/deployments/${azureOpenAIDeploymentName}/chat/completions?api-version=2023-05-15`;

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    let requestData;
    let promptText = '';
    let entryId: string | null = null;
    
    try {
      requestData = await req.json();
      promptText = requestData.promptText || '';
      entryId = requestData.entryId || null;
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Initialize the Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If we have an entry ID but no prompt text, fetch the entry from the database
    if (entryId && !promptText) {
      console.log(`Fetching entry ${entryId} from the database`);
      const { data: entry, error } = await supabase
        .from("anamnes_entries")
        .select("formatted_raw_data")
        .eq("id", entryId)
        .single();

      if (error || !entry) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch entry' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!entry.formatted_raw_data) {
        console.log("Entry has no formatted_raw_data, triggering regeneration");
        
        // If the entry exists but has no formatted_raw_data, regenerate it
        // For this to work, we would need to implement a more complex flow
        // that would require fetching answers and form template, which is beyond
        // the scope of this function. For now, we'll return an error.
        
        return new Response(
          JSON.stringify({ error: 'Entry has no formatted data to summarize' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      promptText = entry.formatted_raw_data;
      console.log(`Using formatted_raw_data from entry ${entryId}`);
    }

    // Check if we have a prompt text to work with
    if (!promptText) {
      return new Response(
        JSON.stringify({ error: 'No prompt text provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log("Generating summary for text of length:", promptText.length);
    
    // Generate summary using Azure OpenAI
    const payload = {
      messages: [
        {
          role: "system",
          content: `Du är en optiker-assistent som hjälper till att sammanfatta patientanamneser. 
          Gör en kort och professionell sammanfattning av den bifogade anamnesen. 
          Fokusera på relevant information för en optiker. 
          Strukturera sammanfattningen i tydliga stycken för följande områden om informationen finns:
          1. Patientens syfte med besöket / huvudproblem
          2. Uppgifter om glasögonhistorik och användning
          3. Besvär och symptom
          4. Övrig relevant information
          Håll sammanfattningen koncis och fokuserad.
          Skriv på svenska.`
        },
        {
          role: "user",
          content: promptText
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    };
    
    console.log("Sending request to Azure OpenAI");
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": azureOpenAIKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Azure OpenAI API error:", errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate summary', 
          details: `API responded with status ${response.status}`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    const summary = result.choices[0].message.content;
    
    console.log("Successfully generated summary");
    
    // If we have an entry ID, update it with the summary
    if (entryId) {
      console.log(`Updating entry ${entryId} with the generated summary`);
      
      const { error: updateError } = await supabase
        .from("anamnes_entries")
        .update({ ai_summary: summary })
        .eq("id", entryId);
      
      if (updateError) {
        console.error("Error updating entry with summary:", updateError);
        // We don't want to fail the whole request just because the update failed
        // So we'll log the error but still return the summary
      } else {
        console.log(`Successfully updated entry ${entryId} with summary`);
      }
    }
    
    return new Response(
      JSON.stringify({ summary }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Unexpected error:", error);
    
    return new Response(
      JSON.stringify({ error: 'Server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

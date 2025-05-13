
/**
 * This edge function interfaces with Azure OpenAI to generate summaries of patient anamnesis data.
 * It processes optimized text inputs and returns AI-generated clinical summaries that help
 * opticians quickly understand patient history and needs.
 * Enhanced to support direct database updates and accept either promptText or entryId.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Standard CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request - CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Get values from environment variables/secrets
    const apiKey = Deno.env.get("AZURE_OPENAI_API_KEY");
    const baseEndpoint = Deno.env.get("AZURE_OPENAI_BASE_ENDPOINT");
    const deploymentName = Deno.env.get("AZURE_OPENAI_DEPLOYMENT_NAME");
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    
    // Create a Supabase client for database operations
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { 'X-Edge-Function': 'generate-summary' } }
    });
    
    // 2. Define API version in code
    const apiVersion = "2025-01-01-preview"; // Using a supported API version
    
    // Check if all Azure OpenAI values exist
    if (!apiKey || !baseEndpoint || !deploymentName) {
      console.error("Azure OpenAI configuration is missing or incomplete");
      throw new Error("Azure OpenAI configuration is missing or incomplete");
    }
    
    // Parse request body
    console.log("Parsing request body...");
    const requestBody = await req.json();
    const { promptText, entryId } = requestBody;
    
    // Variable to hold the text that will be sent to Azure OpenAI
    let textForSummary: string;
    let entry = null;
    
    // If entryId is provided, fetch the entry from the database
    if (entryId && !promptText) {
      console.log(`Fetching entry with ID: ${entryId} to generate summary`);
      
      // Fetch the entry data from the database
      const { data, error } = await supabase
        .from("anamnes_entries")
        .select("id, formatted_raw_data")
        .eq("id", entryId)
        .single();
      
      if (error) {
        console.error(`Error fetching entry: ${error.message}`);
        return new Response(
          JSON.stringify({ error: `Failed to fetch entry: ${error.message}` }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      if (!data || !data.formatted_raw_data) {
        console.error("Entry not found or has no formatted_raw_data");
        return new Response(
          JSON.stringify({ error: "Entry not found or has no formatted data" }),
          { 
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      entry = data;
      textForSummary = data.formatted_raw_data;
      console.log(`Using formatted_raw_data from entry: ${entryId}`);
      console.log(`Text length: ${textForSummary.length}`);
      console.log(`First 100 characters: ${textForSummary.substring(0, 100)}`);
    } 
    // If promptText is provided directly, use that
    else if (promptText) {
      textForSummary = promptText;
      console.log(`Using provided promptText with length: ${promptText.length}`);
      console.log(`First 100 characters: ${promptText.substring(0, 100)}`);
    } 
    // No valid input provided
    else {
      console.error("No prompt text or entry ID provided");
      return new Response(
        JSON.stringify({ error: "No prompt text or entry ID provided" }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Define system prompt
    const systemPrompt = `Du är en AI-assistent specialiserad på att hjälpa optiker. Din roll är att agera som en erfaren klinisk assistent som tolkar och sammanfattar patienters anamnesdata.

Du kommer att få indata i form av en textlista som innehåller frågor ställda till en patient och patientens svar på dessa frågor, extraherade från ett anamnesformulär.

Baserat endast på den information som finns i denna textlista, ska du generera en västrukturerad, koncis och professionell anamnessammanfattning på svenska.

Använd ett objektivt och kliniskt språk med korrekta facktermer där det är relevant.

Strukturera sammanfattningen tydligt, förslagsvis under följande rubriker (anpassa efter den information som finns tillgänglig i texten):
  - Anledning till besök: (Varför patienten söker vård)
  - Aktuella symtom/besvär: (Synproblem, huvudvärk, dubbelseende, torra ögon etc.)
  - Tidigare ögonhistorik: (Användning av glasögon/linser, tidigare undersökningar, operationer, kända ögonsjukdomar)
  - Ärftlighet: (Ögonsjukdomar i släkten)
  - Allmänhälsa/Medicinering: (Relevanta sjukdomar, mediciner, allergier)
  - Socialt/Livsstil: (Yrke, skärmtid, fritidsintressen om relevant)

Viktiga instruktioner:
  1. Inkludera endast information som uttryckligen finns i den angivna fråge- och svarslistan. Gör inga egna antaganden,   tolkningar eller tillägg.
  2. Var koncis och fokusera på det kliniskt relevanta.
  3. Använd tydliga rubriker (utan emojis) för enkel läsbarhet.
  4. Formattera EJ som markdown, utan tänk txt`;

    // Log request parameters for better debugging
    console.log("Request parameters:");
    console.log("- API version:", apiVersion);
    console.log("- Deployment name:", deploymentName);
    console.log("- Temperature:", 0.3);
    console.log("- Max tokens:", 2000);
    
    // 3. Construct the complete URL dynamically
    const requestUrl = `${baseEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
    console.log(`Using Azure OpenAI endpoint: ${baseEndpoint}`);
    
    // 4. Make the fetch call
    console.log("Calling Azure OpenAI API...");
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: textForSummary
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Azure OpenAI API error: ${response.status} ${response.statusText}`, errorData);
      return new Response(
        JSON.stringify({ 
          error: "Failed to generate summary", 
          details: `Status: ${response.status} ${response.statusText}` 
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Process the response
    console.log("Processing Azure OpenAI response...");
    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || "Kunde inte generera sammanfattning.";
    
    console.log("Summary generated successfully");
    console.log("Summary length:", summary.length);
    console.log("First 100 characters of summary:", summary.substring(0, 100));
    
    // If this was called with an entryId, save the summary to the database
    if (entry) {
      console.log(`Saving summary to database for entry: ${entry.id}`);
      
      const { error: updateError } = await supabase
        .from("anamnes_entries")
        .update({ ai_summary: summary })
        .eq("id", entry.id);
      
      if (updateError) {
        console.error(`Error saving summary to database: ${updateError.message}`);
        // We'll still return the summary even if saving failed
      } else {
        console.log("Summary saved successfully to database");
      }
    }
    
    // Return the summary
    return new Response(
      JSON.stringify({ summary }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error("Error in generate-summary function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred" }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

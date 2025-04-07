
/**
 * This edge function interfaces with Azure OpenAI to generate summaries of patient anamnesis data.
 * It processes optimized text inputs and returns AI-generated clinical summaries that can help
 * opticians quickly understand patient history and needs.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    
    // 2. Define API version in code
    const apiVersion = "2025-01-01-preview"; // Using a supported API version
    
    // Check if all values exist
    if (!apiKey || !baseEndpoint || !deploymentName) {
      console.error("Azure OpenAI configuration is missing or incomplete");
      throw new Error("Azure OpenAI configuration is missing or incomplete");
    }
    
    // Parse request body
    console.log("Parsing request body...");
    const { promptText } = await req.json();
    
    if (!promptText) {
      console.error("No prompt text provided");
      return new Response(
        JSON.stringify({ error: "No prompt text provided" }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`Received prompt text with length: ${promptText.length}`);
    
    // 3. Construct the complete URL dynamically
    const requestUrl = `${baseEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
    console.log(`Using Azure OpenAI endpoint: ${baseEndpoint}`);
    
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
  3. Använd enkla emojis för att göra styckena tydligare. `;

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
            content: promptText
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

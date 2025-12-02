
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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    // Create a Supabase client with service role key to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
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
    const { promptText, entryId, examinationType } = requestBody;
    
    // Variable to hold the text that will be sent to Azure OpenAI
    let textForSummary: string;
    let entry = null;
    let examinationTypeForPrompt: string;
    
    // If entryId is provided, fetch the entry from the database
    if (entryId && !promptText) {
      console.log(`[generate-summary] Fetching entry with ID: ${entryId} to generate summary`);
      
      try {
        // Fetch the entry data from the database using service role
        const { data, error } = await supabase
          .from("anamnes_entries")
          .select("id, formatted_raw_data, ai_summary, examination_type")
          .eq("id", entryId)
          .maybeSingle();
        
        if (error) {
          console.error(`[generate-summary] Database error fetching entry: ${error.message}`, error);
          return new Response(
            JSON.stringify({ error: `Database error: ${error.message}` }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        if (!data) {
          console.error(`[generate-summary] Entry not found: ${entryId}`);
          return new Response(
            JSON.stringify({ error: "Entry not found" }),
            { 
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        // Check if AI summary already exists and is recent
        if (data.ai_summary && data.ai_summary.trim().length > 50) {
          console.log(`[generate-summary] AI summary already exists for entry: ${entryId}, skipping generation`);
          return new Response(
            JSON.stringify({ 
              summary: data.ai_summary,
              message: "AI summary already exists"
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        if (!data.formatted_raw_data || data.formatted_raw_data.trim().length === 0) {
          console.error(`[generate-summary] Entry ${entryId} has no formatted_raw_data`);
          return new Response(
            JSON.stringify({ error: "Entry has no formatted data to summarize" }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        entry = data;
        textForSummary = data.formatted_raw_data;
        examinationTypeForPrompt = data.examination_type || 'allmän';
        console.log(`[generate-summary] Using formatted_raw_data from entry: ${entryId}`);
        console.log(`[generate-summary] Examination type: ${examinationTypeForPrompt}`);
        console.log(`[generate-summary] Text length: ${textForSummary.length}`);
        console.log(`[generate-summary] First 100 characters: ${textForSummary.substring(0, 100)}`);
        
      } catch (dbError) {
        console.error(`[generate-summary] Unexpected database error:`, dbError);
        return new Response(
          JSON.stringify({ error: "Database connection error" }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }
    // If promptText is provided directly, use that
    else if (promptText) {
      textForSummary = promptText;
      examinationTypeForPrompt = examinationType || 'allmän';
      console.log(`Using provided promptText with length: ${promptText.length}`);
      console.log(`Examination type: ${examinationTypeForPrompt}`);
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
    
    // Fetch custom AI prompts from organization settings or use defaults
    async function getSystemPrompt(organizationId: string, examinationType: string): Promise<string> {
      // Default prompts as fallback
      const baseInstructions = `Du är en AI-assistent specialiserad på att hjälpa optiker. Din roll är att agera som en erfaren klinisk assistent som tolkar och sammanfattar patienters anamnesdata.

Du kommer att få indata i form av en textlista som innehåller frågor ställda till en patient och patientens svar på dessa frågor, extraherade från ett anamnesformulär.

Baserat endast på den information som finns i denna textlista, ska du generera en välstrukturerad, koncis och professionell anamnessammanfattning på svenska.

Använd ett objektivt och kliniskt språk med korrekta facktermer där det är relevant.

Viktiga instruktioner:
  1. Inkludera endast information som uttryckligen finns i den angivna fråge- och svarslistan. Gör inga egna antaganden, tolkningar eller tillägg.
  2. Var koncis och fokusera på det kliniskt relevanta.
  3. Tänk på att om något INTE står i anamnesen tolkas det som att man INTE har frågat om det.
  4. Använd tydliga rubriker (utan emojis) för enkel läsbarhet.
  5. Formattera EJ som markdown, utan tänk txt.`;

      const defaultPrompts = {
        general: `${baseInstructions}

Strukturera sammanfattningen under följande rubriker (anpassa efter den information som finns tillgänglig):
  - Anledning till besök: (Varför patienten söker vård)
  - Aktuella symtom/besvär: (Synproblem, huvudvärk, dubbelseende, torra ögon etc.)
  - Tidigare ögonhistorik: (Användning av glasögon/linser, tidigare undersökningar, operationer, kända ögonsjukdomar)
  - Ärftlighet: (Ögonsjukdomar i släkten)
  - Allmänhälsa/Medicinering: (Relevanta sjukdomar, mediciner, allergier)
    VIKTIGT om läkemedel: Gruppera ALLTID läkemedel efter kategori istället för att lista enskilda preparat.
    Exempel: Istället för "Metoprolol, Atenolol" skriv "Betablockerare".
    Istället för "Omeprazol, Pantoprazol" skriv "Protonpumpshämmare".
    Istället för "Sertralin, Citalopram" skriv "SSRI-preparat".
    Om bara ett läkemedel i en kategori: skriv kategorin OM känd, annars läkemedelsnamnet.
  - Socialt/Livsstil: (Yrke, skärmtid, fritidsintressen om relevant)`,
        
        driving_license: `${baseInstructions}

KÖRKORTSUNDERSÖKNING - SPECIALINSTRUKTIONER:
Detta är en körkortsundersökning. Använd kortformat:

OM allt är NORMALT (Nej på alla frågor):
- Skriv: "Allt är normalt och licens kan ges för körkortstillstånd grupp I (A, AM, B, BE)." eller motsvarande baserat på önskad körkortskategori.
- Använd INTE några rubriker.
- Håll det MYCKET kort.

OM något är AVVIKANDE (Ja-svar med förklarande text):
- Inkludera fråga och svar för avvikande fynd.
- Avsluta med att resten var normalt.
- Använd INTE rubriker för körkortsundersökningar.
- Håll det kort och fokuserat.`,
        
        lens_examination: `${baseInstructions}

LINSUNDERSÖKNING - Fokusera på följande områden:
  - Anledning till besök: (Nya linser, problem med nuvarande linser, intresse för linser)
  - Aktuella besvär: (Irritation, torrhet, diskomfort, synproblem med linser)
  - Linshistorik: (Tidigare linsanvändning, typ av linser, daglig/månads/årslins)
  - Ögonhälsa: (Torra ögon, allergier, infektioner relaterade till linsanvändning)
  - Livsstil: (Aktiviteter, arbetstid, skärmtid som påverkar linsanvändning)`
      };

      // If no organization ID, use defaults
      if (!organizationId) {
        console.log('[generate-summary] No organization ID, using default prompts');
        switch (examinationType?.toLowerCase()) {
          case 'körkortsundersökning':
            return defaultPrompts.driving_license;
          case 'driving_license':
            return defaultPrompts.driving_license;
          case 'linsundersökning':
          case 'lens_examination':
            return defaultPrompts.lens_examination;
          default:
            return defaultPrompts.general;
        }
      }

      try {
        // Fetch custom prompts from organization settings
        const { data: settings, error } = await supabase
          .from('organization_settings')
          .select('ai_prompt_general, ai_prompt_driving_license, ai_prompt_lens_examination')
          .eq('organization_id', organizationId)
          .maybeSingle();

        if (error) {
          console.log('[generate-summary] Error fetching custom prompts, using defaults:', error.message);
          switch (examinationType?.toLowerCase()) {
            case 'körkortsundersökning':
              return defaultPrompts.driving_license;
            case 'driving_license':
              return defaultPrompts.driving_license;
            case 'linsundersökning':
            case 'lens_examination':
              return defaultPrompts.lens_examination;
            default:
              return defaultPrompts.general;
          }
        }

        if (!settings) {
          console.log('[generate-summary] No custom prompts found, using defaults');
          switch (examinationType?.toLowerCase()) {
            case 'körkortsundersökning':
              return defaultPrompts.driving_license;
            case 'driving_license':
              return defaultPrompts.driving_license;
            case 'linsundersökning':
            case 'lens_examination':
              return defaultPrompts.lens_examination;
            default:
              return defaultPrompts.general;
          }
        }

        // Return custom prompt based on examination type, fallback to default if empty
        console.log('[generate-summary] Using custom prompts from organization settings');
        switch (examinationType?.toLowerCase()) {
          case 'körkortsundersökning':
            return defaultPrompts.driving_license;
          case 'driving_license':
            return settings.ai_prompt_driving_license || defaultPrompts.driving_license;
          case 'linsundersökning':
          case 'lens_examination':
            return settings.ai_prompt_lens_examination || defaultPrompts.lens_examination;
          default:
            return settings.ai_prompt_general || defaultPrompts.general;
        }
      } catch (err) {
        console.error('[generate-summary] Error fetching custom prompts:', err);
        // Fallback to defaults on error
        switch (examinationType?.toLowerCase()) {
          case 'körkortsundersökning':
            return defaultPrompts.driving_license;
          case 'driving_license':
            return defaultPrompts.driving_license;
          case 'linsundersökning':
          case 'lens_examination':
            return defaultPrompts.lens_examination;
          default:
            return defaultPrompts.general;
        }
      }
    }

    // Get organization_id from the entry if we have entryId
    let organizationId = '';
    if (entry) {
      // Fetch organization_id from the entry
      const { data: entryWithOrg, error: orgError } = await supabase
        .from("anamnes_entries")
        .select("organization_id")
        .eq("id", entry.id)
        .single();
      
      if (!orgError && entryWithOrg) {
        organizationId = entryWithOrg.organization_id;
      }
    }

    const systemPrompt = await getSystemPrompt(organizationId, examinationTypeForPrompt);
    console.log(`[generate-summary] Using prompt for examination type: ${examinationTypeForPrompt}`);

    // Log request parameters for better debugging
    console.log("Request parameters:");
    console.log("- API version:", apiVersion);
    console.log("- Deployment name:", deploymentName);
    console.log("- Temperature:", 0.3);
    console.log("- Max tokens:", 2000);
    
    // 3. Construct the complete URL dynamically
    const requestUrl = `${baseEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
    console.log(`Using Azure OpenAI endpoint: ${baseEndpoint}`);
    
    // 4. Make the fetch call with timeout
    console.log("[generate-summary] Calling Azure OpenAI API...");
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    let response;
    try {
      response = await fetch(requestUrl, {
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
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error(`[generate-summary] Azure OpenAI API error: ${response.status} ${response.statusText}`, errorData);
        return new Response(
          JSON.stringify({ 
            error: "Failed to generate summary", 
            details: `Status: ${response.status} ${response.statusText}`,
            responseBody: errorData
          }),
          { 
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Process the response JSON inside the try block
      console.log("[generate-summary] Processing Azure OpenAI response...");
      const data = await response.json();
      
      const summary = data.choices?.[0]?.message?.content || "Kunde inte generera sammanfattning.";
      
      if (!summary || summary.trim().length === 0) {
        console.error(`[generate-summary] Empty summary generated`);
        return new Response(
          JSON.stringify({ error: "Empty summary generated by AI" }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      console.log("[generate-summary] Summary generated successfully");
      console.log(`[generate-summary] Summary length: ${summary.length}`);
      console.log(`[generate-summary] First 100 characters of summary: ${summary.substring(0, 100)}`);
      
      // If this was called with an entryId, save the summary to the database
      if (entry) {
        console.log(`[generate-summary] Saving summary to database for entry: ${entry.id}`);
        
        try {
          const { error: updateError } = await supabase
            .from("anamnes_entries")
            .update({ 
              ai_summary: summary,
              updated_at: new Date().toISOString()
            })
            .eq("id", entry.id);
          
          if (updateError) {
            console.error(`[generate-summary] Error saving summary to database: ${updateError.message}`, updateError);
            // We'll still return the summary even if saving failed
            return new Response(
              JSON.stringify({ 
                summary,
                warning: "Summary generated but failed to save to database"
              }),
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          } else {
            console.log("[generate-summary] Summary saved successfully to database");
          }
        } catch (saveError) {
          console.error(`[generate-summary] Unexpected error saving summary:`, saveError);
          return new Response(
            JSON.stringify({ 
              summary,
              warning: "Summary generated but database save failed"
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      }
      
      // Return the summary
      return new Response(
        JSON.stringify({ summary }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error(`[generate-summary] Azure OpenAI API timeout after 30 seconds`);
        return new Response(
          JSON.stringify({ error: "Request timeout - Azure OpenAI took too long to respond" }),
          { 
            status: 408,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Handle JSON parsing errors
      if (fetchError.message && fetchError.message.includes('JSON')) {
        console.error(`[generate-summary] Failed to parse Azure OpenAI response as JSON:`, fetchError);
        return new Response(
          JSON.stringify({ error: "Invalid response format from Azure OpenAI" }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      console.error(`[generate-summary] Network error calling Azure OpenAI:`, fetchError);
      return new Response(
        JSON.stringify({ error: "Network error calling Azure OpenAI" }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
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

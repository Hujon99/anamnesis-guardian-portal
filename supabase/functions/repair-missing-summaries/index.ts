/**
 * Repair Missing AI Summaries Edge Function
 * This function finds anamnesis entries that are ready but missing AI summaries
 * and generates them automatically. Useful as a background job or manual repair tool.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    // Create Supabase client with service role for full access
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      global: { headers: { 'X-Edge-Function': 'repair-missing-summaries' } }
    });

    console.log("[repair-missing-summaries] Starting repair process...");

    // Find entries that are 'ready' but missing AI summaries
    const { data: entries, error: fetchError } = await supabase
      .from('anamnes_entries')
      .select('id, formatted_raw_data, created_at')
      .eq('status', 'ready')
      .or('ai_summary.is.null,ai_summary.eq.')
      .not('formatted_raw_data', 'is', null)
      .not('formatted_raw_data', 'eq', '')
      .order('created_at', { ascending: false })
      .limit(50); // Process up to 50 entries at a time

    if (fetchError) {
      console.error("[repair-missing-summaries] Error fetching entries:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch entries" }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!entries || entries.length === 0) {
      console.log("[repair-missing-summaries] No entries found that need AI summary repair");
      return new Response(
        JSON.stringify({ 
          message: "No entries found that need AI summary repair",
          processed: 0,
          success: 0,
          failed: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[repair-missing-summaries] Found ${entries.length} entries that need AI summaries`);

    let successCount = 0;
    let failedCount = 0;
    const results = [];

    // Process each entry
    for (const entry of entries) {
      try {
        console.log(`[repair-missing-summaries] Processing entry: ${entry.id}`);

        // Call generate-summary function for this entry
        const summaryResponse = await supabase.functions.invoke('generate-summary', {
          body: { entryId: entry.id }
        });

        if (summaryResponse.error) {
          console.error(`[repair-missing-summaries] Error for entry ${entry.id}:`, summaryResponse.error);
          failedCount++;
          results.push({
            entryId: entry.id,
            success: false,
            error: summaryResponse.error.message
          });
        } else if (summaryResponse.data?.error) {
          console.error(`[repair-missing-summaries] Generate summary error for entry ${entry.id}:`, summaryResponse.data.error);
          failedCount++;
          results.push({
            entryId: entry.id,
            success: false,
            error: summaryResponse.data.error
          });
        } else {
          console.log(`[repair-missing-summaries] Successfully generated AI summary for entry: ${entry.id}`);
          successCount++;
          results.push({
            entryId: entry.id,
            success: true
          });
        }

        // Add small delay between requests to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`[repair-missing-summaries] Unexpected error processing entry ${entry.id}:`, error);
        failedCount++;
        results.push({
          entryId: entry.id,
          success: false,
          error: error.message
        });
      }
    }

    const summary = {
      message: "AI summary repair process completed",
      processed: entries.length,
      success: successCount,
      failed: failedCount,
      results: results
    };

    console.log(`[repair-missing-summaries] Process completed: ${successCount} success, ${failedCount} failed`);

    return new Response(
      JSON.stringify(summary),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error("[repair-missing-summaries] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred" }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
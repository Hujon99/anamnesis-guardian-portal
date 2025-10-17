/**
 * Track Upgrade Conversion Edge Function
 * 
 * This function tracks when patients accept/decline upgrade offers in questionnaires.
 * It stores anonymized conversion data for business analytics while respecting privacy.
 * 
 * Called asynchronously from submit-form edge function to avoid blocking form submission.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrackingRequest {
  entry_id: string;
  answers: Record<string, any>;
  organization_id: string;
  form_id: string;
  store_id?: string;
  examination_type?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { entry_id, answers, organization_id, form_id, store_id, examination_type } = await req.json() as TrackingRequest;

    console.log('[track-upgrade-conversion]: Processing tracking request for entry:', entry_id);

    // Find upgrade questions in answers (questions with ID starting with "upgrade_")
    const upgradeQuestions = Object.entries(answers).filter(([key]) => 
      key.startsWith('upgrade_')
    );

    if (upgradeQuestions.length === 0) {
      console.log('[track-upgrade-conversion]: No upgrade questions found in answers');
      return new Response(
        JSON.stringify({ success: true, message: 'No upgrade questions to track' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Track each upgrade question
    const trackingPromises = upgradeQuestions.map(async ([question_id, answer]) => {
      // Determine if upgrade was accepted
      const upgrade_accepted = 
        answer === 'Ja, jag vill uppgradera' || 
        answer === 'Ja' || 
        answer === true ||
        (typeof answer === 'string' && answer.toLowerCase().includes('ja'));

      console.log(`[track-upgrade-conversion]: Tracking ${question_id}: ${upgrade_accepted ? 'accepted' : 'declined'}`);

      const { error } = await supabaseAdmin
        .from('upgrade_conversions')
        .insert({
          entry_id,
          organization_id,
          upgrade_question_id: question_id,
          upgrade_accepted,
          examination_type,
          form_id,
          store_id,
        });

      if (error) {
        // Log error but don't fail the entire operation
        console.error(`[track-upgrade-conversion]: Error tracking ${question_id}:`, error);
        return { success: false, question_id, error: error.message };
      }

      return { success: true, question_id, upgrade_accepted };
    });

    const results = await Promise.all(trackingPromises);
    const successCount = results.filter(r => r.success).length;

    console.log(`[track-upgrade-conversion]: Successfully tracked ${successCount}/${results.length} upgrade questions`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        tracked: successCount,
        total: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[track-upgrade-conversion]: Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
/**
 * Edge function to retrieve forms assigned to a specific store.
 * This function bypasses potential RLS issues by using service_role access.
 * 
 * Request: POST with { storeId: string }
 * Response: Array of form objects with schema, id, title, organization_id, examination_type
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.40.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FormTemplateWithMeta {
  schema: any;
  id: string;
  title: string;
  organization_id: string | null;
  examination_type?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[get-store-forms]: Function invoked');

    // Parse request body
    const { storeId } = await req.json();
    
    if (!storeId) {
      console.error('[get-store-forms]: Missing storeId in request');
      return new Response(
        JSON.stringify({ error: 'storeId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[get-store-forms]: Fetching forms for storeId:', storeId);

    // Create Supabase client with service role for reliable access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Get active form assignments for this store
    const { data: storeFormsData, error: storeFormsError } = await supabase
      .from('store_forms')
      .select('form_id, is_active')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (storeFormsError) {
      console.error('[get-store-forms]: Error fetching store_forms:', storeFormsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch store form assignments', details: storeFormsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[get-store-forms]: Found', storeFormsData?.length || 0, 'active form assignments');

    // If no active assignments, return empty array
    if (!storeFormsData || storeFormsData.length === 0) {
      console.log('[get-store-forms]: No active form assignments for this store');
      return new Response(
        JSON.stringify([]),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Fetch the actual form data
    const formIds = storeFormsData.map(sf => sf.form_id);
    console.log('[get-store-forms]: Fetching form details for formIds:', formIds);

    const { data: formsData, error: formsError } = await supabase
      .from('anamnes_forms')
      .select('id, title, examination_type, organization_id, schema')
      .in('id', formIds);

    if (formsError) {
      console.error('[get-store-forms]: Error fetching anamnes_forms:', formsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch form details', details: formsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!formsData || formsData.length === 0) {
      console.warn('[get-store-forms]: Form assignments exist but no form details found');
      return new Response(
        JSON.stringify([]),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Transform to expected format
    const result: FormTemplateWithMeta[] = formsData.map(form => ({
      schema: form.schema,
      id: form.id,
      title: form.title,
      organization_id: form.organization_id,
      examination_type: form.examination_type,
    }));

    console.log('[get-store-forms]: Successfully returning', result.length, 'forms');

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-store-forms]: Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

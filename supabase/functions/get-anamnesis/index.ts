/**
 * GET Anamnesis API Endpoint
 * 
 * This edge function allows external systems (e.g., ServeIT) to fetch completed
 * anamnesis data for a specific booking. Used when optician opens a patient journal.
 * 
 * Authentication: API Key (X-API-Key header)
 * 
 * Request:
 * POST /functions/v1/get-anamnesis
 * Headers: X-API-Key: anp_live_xxxxx
 * Body: { bookingId, includeRawData?, includeDrivingLicense? }
 * 
 * Response:
 * 200: { success: true, data: { entryId, bookingId, firstName, ... } }
 * 404: { error: "No anamnesis found for this booking" }
 * 401: { error: "Invalid API key" }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.40.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface GetAnamnesisRequest {
  bookingId: string;
  includeRawData?: boolean;
  includeDrivingLicense?: boolean;
}

interface ApiKey {
  id: string;
  organization_id: string;
  permissions: string[];
  is_active: boolean;
  expires_at: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('🔍 get-anamnesis started at:', new Date().toISOString());

  try {
    // 1. Validate API Key
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      console.error('❌ Missing API key');
      return new Response(
        JSON.stringify({ error: 'Missing API key', code: 'INVALID_API_KEY' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Validate API key and get organization
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('id, organization_id, permissions, is_active, expires_at')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (apiKeyError || !apiKeyData) {
      console.error('❌ Invalid API key:', apiKeyError);
      return new Response(
        JSON.stringify({ error: 'Invalid API key', code: 'INVALID_API_KEY' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validatedApiKey = apiKeyData as ApiKey;

    // Check if expired
    if (validatedApiKey.expires_at && new Date(validatedApiKey.expires_at) < new Date()) {
      console.error('❌ API key expired');
      return new Response(
        JSON.stringify({ error: 'API key expired', code: 'API_KEY_EXPIRED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check permissions
    if (!validatedApiKey.permissions.includes('read')) {
      console.error('❌ Insufficient permissions');
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ API key validated for organization:', validatedApiKey.organization_id);

    // 4. Parse request body
    const body: GetAnamnesisRequest = await req.json();
    const { bookingId, includeRawData = false, includeDrivingLicense = false } = body;

    if (!bookingId) {
      console.error('❌ Missing bookingId');
      return new Response(
        JSON.stringify({ error: 'Missing bookingId', code: 'MISSING_REQUIRED_FIELD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📋 Fetching anamnesis for bookingId:', bookingId);

    // 5. Fetch anamnesis entry
    let query = supabase
      .from('anamnes_entries')
      .select(`
        id,
        booking_id,
        first_name,
        personal_number,
        status,
        sent_at,
        examination_type,
        formatted_raw_data,
        ai_summary,
        booking_date,
        store_id,
        stores (
          name,
          address,
          phone,
          email
        ),
        ${includeRawData ? 'answers,' : ''}
        scoring_result
      `)
      .eq('booking_id', bookingId)
      .eq('organization_id', validatedApiKey.organization_id);

    const { data: entry, error: entryError } = await query.single();

    if (entryError || !entry) {
      console.error('❌ Anamnesis not found:', entryError);
      return new Response(
        JSON.stringify({ 
          error: 'No anamnesis found for this booking',
          bookingId,
          code: 'ANAMNESIS_NOT_FOUND'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Check if anamnesis is ready
    if (entry.status !== 'ready' && entry.status !== 'reviewed' && entry.status !== 'journaled') {
      console.warn('⚠️ Anamnesis not ready, status:', entry.status);
      return new Response(
        JSON.stringify({ 
          error: 'Anamnesis not completed yet',
          bookingId,
          status: entry.status,
          code: 'ANAMNESIS_NOT_READY'
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Anamnesis found, status:', entry.status);

    // 7. Optionally fetch driving license data
    let drivingLicenseData = null;
    if (includeDrivingLicense && entry.examination_type === 'Körkortsundersökning') {
      const { data: dlData } = await supabase
        .from('driving_license_examinations')
        .select('*')
        .eq('entry_id', entry.id)
        .single();
      
      drivingLicenseData = dlData;
      console.log('✅ Driving license data included');
    }

    // 8. Update API key last_used_at
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', validatedApiKey.id);

    // 9. Log access for GDPR audit
    await supabase.from('audit_data_access').insert({
      user_id: `api_key_${validatedApiKey.id}`,
      organization_id: validatedApiKey.organization_id,
      table_name: 'anamnes_entries',
      record_id: entry.id,
      action_type: 'read',
      purpose: 'API access via get-anamnesis',
      route: '/functions/v1/get-anamnesis'
    });

    // 10. Build response
    const responseData = {
      entryId: entry.id,
      bookingId: entry.booking_id,
      firstName: entry.first_name,
      personalNumber: entry.personal_number,
      status: entry.status,
      submittedAt: entry.sent_at,
      examinationType: entry.examination_type,
      bookingDate: entry.booking_date,
      store: entry.stores ? {
        name: entry.stores.name,
        address: entry.stores.address,
        phone: entry.stores.phone,
        email: entry.stores.email
      } : null,
      formattedSummary: entry.formatted_raw_data,
      aiSummary: entry.ai_summary,
      scoringResult: entry.scoring_result,
      ...(includeRawData && { answers: entry.answers }),
      ...(drivingLicenseData && { drivingLicenseData })
    };

    const duration = Date.now() - startTime;
    console.log(`✅ Request completed in ${duration}ms`);

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Response-Time': `${duration}ms`
        } 
      }
    );

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

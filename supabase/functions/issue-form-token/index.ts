
/**
 * This Edge Function generates access tokens for magic link anamnes forms.
 * It creates a new entry in the anamnes_entries table with booking information
 * and returns an access token that can be used to access the form.
 * 
 * NEW: Now supports API key authentication and formType parameter for external integrations.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.1";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// Create a Supabase client using env vars
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Request received:", req.method);
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    
    // Check for API key authentication
    const apiKey = req.headers.get('x-api-key');
    let organizationId: string | null = null;
    let isApiRequest = false;

    if (apiKey) {
      console.log("🔑 API key provided, validating...");
      
      // Validate API key
      const { data: apiKeyData, error: apiKeyError } = await supabase
        .from('api_keys')
        .select('organization_id, permissions, is_active, expires_at')
        .eq('api_key', apiKey)
        .eq('is_active', true)
        .single();

      if (apiKeyError || !apiKeyData) {
        console.error("❌ Invalid API key");
        return new Response(
          JSON.stringify({ error: 'Invalid API key', code: 'INVALID_API_KEY' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check expiry
      if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
        console.error("❌ API key expired");
        return new Response(
          JSON.stringify({ error: 'API key expired', code: 'API_KEY_EXPIRED' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check write permission
      const permissions = Array.isArray(apiKeyData.permissions) ? apiKeyData.permissions : [];
      if (!permissions.includes('write')) {
        console.error("❌ Insufficient permissions");
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      organizationId = apiKeyData.organization_id;
      isApiRequest = true;
      
      console.log("✅ API key validated for organization:", organizationId);
      
      // Update last_used_at
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('api_key', apiKey);
    }
    
    // Parse the request body
    const { 
      bookingId, 
      firstName,
      personalNumber,
      storeId, 
      storeName: inputStoreName, 
      bookingDate, 
      formId,
      formType,
      isKioskMode = false,
      requireSupervisorCode = false,
      expiresInDays = 7,
      metadata
    } = await req.json();
    
    // Create mutable variable for store name
    let effectiveStoreName = inputStoreName;
    
    // Validate required parameters
    if (!bookingId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameter: bookingId',
          code: 'MISSING_REQUIRED_FIELD'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    if (!formId && !formType) {
      return new Response(
        JSON.stringify({ 
          error: 'Either formId or formType must be provided',
          code: 'MISSING_REQUIRED_FIELD'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log("Parameters received:", { bookingId, firstName, personalNumber, storeId, storeName: inputStoreName, bookingDate, formId, formType, isApiRequest });
    
    // Determine actual formId
    let actualFormId = formId;

    // If formType is provided instead of formId, look up the form
    if (!actualFormId && formType && organizationId) {
      console.log("🔍 Looking up form by type:", formType, "for organization:", organizationId);
      
      const { data: forms, error: formLookupError } = await supabase
        .from('anamnes_forms')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('examination_type', formType)
        .eq('is_active', true)
        .limit(1);
      
      if (formLookupError) {
        console.error("Error looking up form by type:", formLookupError);
        return new Response(
          JSON.stringify({ 
            error: `Error looking up form type: ${formType}`,
            code: 'FORM_LOOKUP_ERROR',
            details: formLookupError.message
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (forms && forms.length > 0) {
        actualFormId = forms[0].id;
        console.log("✅ Found form by type:", actualFormId);
      } else {
        console.error("❌ No active form found for type:", formType);
        return new Response(
          JSON.stringify({ 
            error: `No active form found for type: ${formType}`,
            code: 'FORM_NOT_FOUND'
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Check if form exists and get its organization
    const { data: formData, error: formError } = await supabase
      .from('anamnes_forms')
      .select('organization_id, title, examination_type')
      .eq('id', actualFormId)
      .single();
      
    if (formError) {
      console.error("Error fetching form data:", formError);
      return new Response(
        JSON.stringify({ error: 'Invalid form ID', code: 'FORM_NOT_FOUND', details: formError.message }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // If API request, verify organization matches
    if (isApiRequest && organizationId && formData.organization_id !== organizationId) {
      console.error("❌ Form does not belong to API key's organization");
      return new Response(
        JSON.stringify({ 
          error: 'Form does not belong to your organization',
          code: 'UNAUTHORIZED_FORM_ACCESS'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!formData.organization_id) {
      console.log("Form has no organization, using the default form");
    } else {
      console.log("Using form for organization:", formData.organization_id);
    }
    
    // Handle store reference
    let finalStoreId = null;
    
    // Handle both store ID and store name cases properly
    if (storeId) {
      // Check if storeId is a UUID or a store name
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (uuidPattern.test(storeId)) {
        // If it's already a valid UUID, use it directly
        console.log("Using provided store ID (valid UUID):", storeId);
        finalStoreId = storeId;
      } else {
        // If it's not a UUID, treat it as a store name
        console.log("Received store ID that is not a UUID, treating as store name:", storeId);
        effectiveStoreName = storeId;
      }
    }
    
    // If we have a store name but no valid UUID, find or create the store
    if (!finalStoreId && (effectiveStoreName || storeId) && formData.organization_id) {
      // Use either effectiveStoreName if provided or storeId as the name
      const nameToUse = effectiveStoreName || storeId;
      console.log("Looking up store by name:", nameToUse);
      
      try {
        // Find store by name
        const { data: existingStore, error: storeError } = await supabase
          .from('stores')
          .select('id')
          .eq('organization_id', formData.organization_id)
          .ilike('name', nameToUse)
          .limit(1)
          .single();
          
        if (storeError && storeError.code !== 'PGRST116') {
          throw storeError;
        }
        
        // If store exists, use it
        if (existingStore) {
          console.log("Found existing store:", existingStore.id);
          finalStoreId = existingStore.id;
        } else {
          // Otherwise create a new store
          console.log("Creating new store with name:", nameToUse);
          const { data: newStore, error: createError } = await supabase
            .from('stores')
            .insert({
              name: nameToUse,
              organization_id: formData.organization_id
            })
            .select('id')
            .single();
            
          if (createError) {
            throw createError;
          }
          
          finalStoreId = newStore.id;
          console.log("Created new store with ID:", finalStoreId);
        }
      } catch (storeError) {
        console.error("Error handling store:", storeError);
        // Continue without store ID if there was an error
        finalStoreId = null;
      }
    }
    
    // Generate access token
    const accessToken = uuidv4();
    
    // Set expiry date based on kiosk mode or custom days
    const expiresAt = new Date();
    if (isKioskMode) {
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours for kiosk
      console.log("Creating kiosk mode entry with 24h expiry");
    } else {
      expiresAt.setDate(expiresAt.getDate() + expiresInDays); // Custom days (default 7)
      console.log(`Creating entry with ${expiresInDays} days expiry`);
    }
    
    // Create new entry in anamnes_entries
    const { data: entry, error: entryError } = await supabase
      .from('anamnes_entries')
      .insert({
        form_id: actualFormId,
        organization_id: formData.organization_id,
        access_token: accessToken,
        booking_id: bookingId,
        first_name: firstName || null,
        personal_number: personalNumber || null,
        store_id: finalStoreId,
        booking_date: bookingDate ? new Date(bookingDate).toISOString() : null,
        is_magic_link: true,
        is_kiosk_mode: isKioskMode,
        require_supervisor_code: isKioskMode && requireSupervisorCode,
        status: 'sent',
        sent_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();
    
    if (entryError) {
      console.error("Error creating entry:", entryError);
      return new Response(
        JSON.stringify({ error: 'Failed to create entry', code: 'DATABASE_ERROR', details: entryError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Generate URLs
    const baseUrl = 'https://anamnesportalen.se';
    const formUrl = `${baseUrl}/form?token=${accessToken}`;
    const qrCodeUrl = `${baseUrl}/api/qr?token=${accessToken}`;
    
    // Return enhanced response
    return new Response(
      JSON.stringify({ 
        success: true,
        accessToken,
        entryId: entry.id,
        formUrl,
        qrCodeUrl,
        expiresAt: expiresAt.toISOString(),
        formId: actualFormId,
        organizationId: formData.organization_id,
        ...(metadata && { metadata })
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error("Unexpected error:", error);
    
    return new Response(
      JSON.stringify({ error: 'Server error', code: 'INTERNAL_ERROR', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

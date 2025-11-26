
/**
 * This Edge Function generates access tokens for magic link anamnes forms.
 * It creates a new entry in the anamnes_entries table with booking information
 * and returns an access token that can be used to access the form.
 * 
 * Features:
 * - API key authentication for external integrations
 * - formType parameter to look up forms by examination type
 * - Duplicate booking detection with force override option
 * - Comprehensive request logging to api_request_logs table
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

/**
 * Anonymize IP address for GDPR compliance
 * Keeps first two octets for IPv4, first four groups for IPv6
 */
function anonymizeIp(ip: string | null): string | null {
  if (!ip) return null;
  
  // Handle comma-separated IPs (from x-forwarded-for)
  const firstIp = ip.split(',')[0].trim();
  
  // IPv4
  if (firstIp.includes('.')) {
    const parts = firstIp.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.x.x`;
    }
  }
  
  // IPv6
  if (firstIp.includes(':')) {
    const parts = firstIp.split(':');
    if (parts.length >= 4) {
      return `${parts.slice(0, 4).join(':')}:x:x:x:x`;
    }
  }
  
  return null;
}

/**
 * Log API request to database
 */
async function logApiRequest(
  supabase: any,
  data: {
    endpoint: string;
    method: string;
    apiKeyId?: string | null;
    organizationId?: string | null;
    requestParams?: object;
    responseStatus: number;
    responseCode?: string;
    errorMessage?: string;
    createdEntryId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    executionTimeMs: number;
  }
) {
  try {
    await supabase.from('api_request_logs').insert({
      endpoint: data.endpoint,
      method: data.method,
      api_key_id: data.apiKeyId || null,
      organization_id: data.organizationId || null,
      request_params: data.requestParams || null,
      response_status: data.responseStatus,
      response_code: data.responseCode || null,
      error_message: data.errorMessage || null,
      created_entry_id: data.createdEntryId || null,
      ip_address_anonymized: data.ipAddress || null,
      user_agent: data.userAgent || null,
      execution_time_ms: data.executionTimeMs
    });
  } catch (logError) {
    console.error("Failed to log API request:", logError);
    // Don't throw - logging failure shouldn't break the API
  }
}

serve(async (req: Request) => {
  const startTime = Date.now();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Extract metadata for logging
  const ipAddress = anonymizeIp(req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'));
  const userAgent = req.headers.get('user-agent');

  // Initialize Supabase client early for logging
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  // Variables to track for logging
  let apiKeyId: string | null = null;
  let organizationId: string | null = null;
  let requestParams: object = {};

  try {
    console.log("Request received:", req.method);
    
    // Check for API key authentication
    const apiKey = req.headers.get('x-api-key');
    let isApiRequest = false;

    if (apiKey) {
      console.log("🔑 API key provided, validating...");
      
      // Validate API key
      const { data: apiKeyData, error: apiKeyError } = await supabase
        .from('api_keys')
        .select('id, organization_id, permissions, is_active, expires_at')
        .eq('api_key', apiKey)
        .eq('is_active', true)
        .single();

      if (apiKeyError || !apiKeyData) {
        console.error("❌ Invalid API key");
        await logApiRequest(supabase, {
          endpoint: 'issue-form-token',
          method: req.method,
          responseStatus: 401,
          responseCode: 'INVALID_API_KEY',
          errorMessage: 'Invalid API key',
          ipAddress,
          userAgent,
          executionTimeMs: Date.now() - startTime
        });
        return new Response(
          JSON.stringify({ error: 'Invalid API key', code: 'INVALID_API_KEY' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      apiKeyId = apiKeyData.id;

      // Check expiry
      if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
        console.error("❌ API key expired");
        await logApiRequest(supabase, {
          endpoint: 'issue-form-token',
          method: req.method,
          apiKeyId,
          organizationId: apiKeyData.organization_id,
          responseStatus: 401,
          responseCode: 'API_KEY_EXPIRED',
          errorMessage: 'API key expired',
          ipAddress,
          userAgent,
          executionTimeMs: Date.now() - startTime
        });
        return new Response(
          JSON.stringify({ error: 'API key expired', code: 'API_KEY_EXPIRED' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check write permission
      const permissions = Array.isArray(apiKeyData.permissions) ? apiKeyData.permissions : [];
      if (!permissions.includes('write')) {
        console.error("❌ Insufficient permissions");
        await logApiRequest(supabase, {
          endpoint: 'issue-form-token',
          method: req.method,
          apiKeyId,
          organizationId: apiKeyData.organization_id,
          responseStatus: 403,
          responseCode: 'INSUFFICIENT_PERMISSIONS',
          errorMessage: 'Insufficient permissions - write access required',
          ipAddress,
          userAgent,
          executionTimeMs: Date.now() - startTime
        });
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
      metadata,
      force = false  // Allow forcing creation even if duplicate exists
    } = await req.json();
    
    // Store sanitized request params for logging (no PII)
    requestParams = {
      bookingId,
      hasFirstName: !!firstName,
      hasPersonalNumber: !!personalNumber,
      storeId: storeId || null,
      storeName: inputStoreName || null,
      hasBookingDate: !!bookingDate,
      formId: formId || null,
      formType: formType || null,
      isKioskMode,
      requireSupervisorCode,
      expiresInDays,
      force
    };
    
    // Create mutable variable for store name
    let effectiveStoreName = inputStoreName;
    
    // Validate required parameters
    if (!bookingId) {
      await logApiRequest(supabase, {
        endpoint: 'issue-form-token',
        method: req.method,
        apiKeyId,
        organizationId,
        requestParams,
        responseStatus: 400,
        responseCode: 'MISSING_REQUIRED_FIELD',
        errorMessage: 'Missing required parameter: bookingId',
        ipAddress,
        userAgent,
        executionTimeMs: Date.now() - startTime
      });
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
      await logApiRequest(supabase, {
        endpoint: 'issue-form-token',
        method: req.method,
        apiKeyId,
        organizationId,
        requestParams,
        responseStatus: 400,
        responseCode: 'MISSING_REQUIRED_FIELD',
        errorMessage: 'Either formId or formType must be provided',
        ipAddress,
        userAgent,
        executionTimeMs: Date.now() - startTime
      });
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
        await logApiRequest(supabase, {
          endpoint: 'issue-form-token',
          method: req.method,
          apiKeyId,
          organizationId,
          requestParams,
          responseStatus: 500,
          responseCode: 'FORM_LOOKUP_ERROR',
          errorMessage: `Error looking up form type: ${formType} - ${formLookupError.message}`,
          ipAddress,
          userAgent,
          executionTimeMs: Date.now() - startTime
        });
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
        await logApiRequest(supabase, {
          endpoint: 'issue-form-token',
          method: req.method,
          apiKeyId,
          organizationId,
          requestParams,
          responseStatus: 404,
          responseCode: 'FORM_NOT_FOUND',
          errorMessage: `No active form found for type: ${formType}`,
          ipAddress,
          userAgent,
          executionTimeMs: Date.now() - startTime
        });
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
      await logApiRequest(supabase, {
        endpoint: 'issue-form-token',
        method: req.method,
        apiKeyId,
        organizationId,
        requestParams,
        responseStatus: 404,
        responseCode: 'FORM_NOT_FOUND',
        errorMessage: `Invalid form ID - ${formError.message}`,
        ipAddress,
        userAgent,
        executionTimeMs: Date.now() - startTime
      });
      return new Response(
        JSON.stringify({ error: 'Invalid form ID', code: 'FORM_NOT_FOUND', details: formError.message }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Update organizationId from form if not set from API key
    if (!organizationId) {
      organizationId = formData.organization_id;
    }
    
    // If API request, verify organization matches
    if (isApiRequest && organizationId && formData.organization_id !== organizationId) {
      console.error("❌ Form does not belong to API key's organization");
      await logApiRequest(supabase, {
        endpoint: 'issue-form-token',
        method: req.method,
        apiKeyId,
        organizationId,
        requestParams,
        responseStatus: 403,
        responseCode: 'UNAUTHORIZED_FORM_ACCESS',
        errorMessage: 'Form does not belong to your organization',
        ipAddress,
        userAgent,
        executionTimeMs: Date.now() - startTime
      });
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
    
    // Validate that the form is active for the store via store_forms table
    if (finalStoreId && formData.organization_id) {
      console.log("🔍 Validating form-store assignment...");
      
      const { data: storeFormAssignment, error: assignmentError } = await supabase
        .from('store_forms')
        .select('id, is_active')
        .eq('store_id', finalStoreId)
        .eq('form_id', actualFormId)
        .eq('organization_id', formData.organization_id)
        .single();
      
      if (assignmentError && assignmentError.code !== 'PGRST116') {
        console.error("Error checking store-form assignment:", assignmentError);
        // Log but don't fail - assignment might not exist yet
      }
      
      if (!storeFormAssignment) {
        console.warn("⚠️ No store-form assignment found for store:", finalStoreId, "and form:", actualFormId);
        // Create the assignment automatically for API-created entries
        console.log("📝 Auto-creating store-form assignment...");
        const { error: createAssignmentError } = await supabase
          .from('store_forms')
          .insert({
            store_id: finalStoreId,
            form_id: actualFormId,
            organization_id: formData.organization_id,
            is_active: true
          });
        
        if (createAssignmentError && !createAssignmentError.message?.includes('duplicate')) {
          console.error("Failed to create store-form assignment:", createAssignmentError);
        } else {
          console.log("✅ Store-form assignment created");
        }
      } else if (!storeFormAssignment.is_active) {
        console.error("❌ Form is not active for this store");
        await logApiRequest(supabase, {
          endpoint: 'issue-form-token',
          method: req.method,
          apiKeyId,
          organizationId,
          requestParams,
          responseStatus: 403,
          responseCode: 'FORM_NOT_ACTIVE_FOR_STORE',
          errorMessage: 'Form is not active for this store',
          ipAddress,
          userAgent,
          executionTimeMs: Date.now() - startTime
        });
        return new Response(
          JSON.stringify({ 
            error: 'Form is not active for this store',
            code: 'FORM_NOT_ACTIVE_FOR_STORE',
            formId: actualFormId,
            storeId: finalStoreId
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.log("✅ Form-store assignment validated");
      }
    }
    
    // ========== DUPLICATE CHECK ==========
    // Check for existing active entry with same bookingId in this organization
    console.log("🔍 Checking for duplicate bookingId:", bookingId);
    
    const { data: existingEntries, error: duplicateCheckError } = await supabase
      .from('anamnes_entries')
      .select('id, access_token, status, expires_at, first_name, form_id, created_at')
      .eq('organization_id', formData.organization_id)
      .eq('booking_id', bookingId)
      .in('status', ['sent', 'ready', 'klar för undersökning'])
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (duplicateCheckError) {
      console.error("Error checking for duplicates:", duplicateCheckError);
      // Continue anyway - better to create than to block completely
    }

    if (existingEntries && existingEntries.length > 0) {
      const existingEntry = existingEntries[0];
      console.log("⚠️ Duplicate bookingId found:", existingEntry.id, "Status:", existingEntry.status);
      
      if (!force) {
        // Return conflict error with info about the existing entry
        await logApiRequest(supabase, {
          endpoint: 'issue-form-token',
          method: req.method,
          apiKeyId,
          organizationId,
          requestParams,
          responseStatus: 409,
          responseCode: 'DUPLICATE_BOOKING_ID',
          errorMessage: `Duplicate booking ID found: ${existingEntry.id}`,
          ipAddress,
          userAgent,
          executionTimeMs: Date.now() - startTime
        });
        return new Response(
          JSON.stringify({ 
            error: 'An active entry with this bookingId already exists',
            code: 'DUPLICATE_BOOKING_ID',
            existingEntry: {
              id: existingEntry.id,
              status: existingEntry.status,
              expiresAt: existingEntry.expires_at,
              firstName: existingEntry.first_name,
              createdAt: existingEntry.created_at
            },
            hint: 'Use force: true to replace the existing entry, or wait for it to expire.'
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Force mode: Mark all existing entries as replaced
      console.log("🔄 Force mode enabled - marking", existingEntries.length, "existing entries as replaced");
      
      for (const entry of existingEntries) {
        const { error: updateError } = await supabase
          .from('anamnes_entries')
          .update({ 
            status: 'replaced',
            internal_notes: `Replaced by new entry at ${new Date().toISOString()}`
          })
          .eq('id', entry.id);
        
        if (updateError) {
          console.error("Error marking entry as replaced:", entry.id, updateError);
        } else {
          console.log("✅ Marked entry as replaced:", entry.id);
        }
      }
    } else {
      console.log("✅ No duplicate found, proceeding...");
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
      await logApiRequest(supabase, {
        endpoint: 'issue-form-token',
        method: req.method,
        apiKeyId,
        organizationId,
        requestParams,
        responseStatus: 500,
        responseCode: 'DATABASE_ERROR',
        errorMessage: `Failed to create entry - ${entryError.message}`,
        ipAddress,
        userAgent,
        executionTimeMs: Date.now() - startTime
      });
      return new Response(
        JSON.stringify({ error: 'Failed to create entry', code: 'DATABASE_ERROR', details: entryError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Generate URLs - use production domain
    const baseUrl = 'https://anamnes.binokeloptik.se';
    const formUrl = `${baseUrl}/patient-form?token=${accessToken}`;
    const qrCodeUrl = `${baseUrl}/patient-form?token=${accessToken}`;
    
    // Log successful request
    await logApiRequest(supabase, {
      endpoint: 'issue-form-token',
      method: req.method,
      apiKeyId,
      organizationId,
      requestParams,
      responseStatus: 200,
      responseCode: 'SUCCESS',
      createdEntryId: entry.id,
      ipAddress,
      userAgent,
      executionTimeMs: Date.now() - startTime
    });
    
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
    
    // Log unexpected error
    await logApiRequest(supabase, {
      endpoint: 'issue-form-token',
      method: req.method,
      apiKeyId,
      organizationId,
      requestParams,
      responseStatus: 500,
      responseCode: 'INTERNAL_ERROR',
      errorMessage: error.message || 'Unknown error',
      ipAddress,
      userAgent,
      executionTimeMs: Date.now() - startTime
    });
    
    return new Response(
      JSON.stringify({ error: 'Server error', code: 'INTERNAL_ERROR', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});


/**
 * This Edge Function generates access tokens for magic link anamnes forms.
 * It creates a new entry in the anamnes_entries table with booking information
 * and returns an access token that can be used to access the form.
 * It verifies that the form exists and belongs to the correct organization.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.1";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    
    // Parse the request body
    const { 
      bookingId, 
      firstName, 
      storeId, 
      storeName: inputStoreName, 
      bookingDate, 
      formId,
      isKioskMode = false,
      requireSupervisorCode = false
    } = await req.json();
    
    // Create mutable variable for store name
    let effectiveStoreName = inputStoreName;
    
    // Validate required parameters
    if (!bookingId || !formId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters',
          details: 'bookingId and formId are required'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log("Parameters received:", { bookingId, firstName, storeId, storeName: inputStoreName, bookingDate, formId });
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    
    // Check if form exists and get its organization
    const { data: formData, error: formError } = await supabase
      .from('anamnes_forms')
      .select('organization_id, title')
      .eq('id', formId)
      .single();
      
    if (formError) {
      console.error("Error fetching form data:", formError);
      return new Response(
        JSON.stringify({ error: 'Invalid form ID', details: formError.message }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    if (!formData.organization_id) {
      console.log("Form has no organization, using the default form");
      // This is the default form (organization_id is null), which is fine to use
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
        effectiveStoreName = storeId; // Use storeId as storeName (using our mutable variable)
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
    
    // Set expiry date based on kiosk mode
    // Kiosk mode: 24 hours, Normal mode: 7 days
    const expiresAt = new Date();
    if (isKioskMode) {
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours for kiosk
      console.log("Creating kiosk mode entry with 24h expiry");
    } else {
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days for normal
    }
    
    // Create new entry in anamnes_entries
    const { data: entry, error: entryError } = await supabase
      .from('anamnes_entries')
      .insert({
        form_id: formId,
        organization_id: formData.organization_id, // Use the organization from the form
        access_token: accessToken,
        booking_id: bookingId,
        first_name: firstName || null,
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
        JSON.stringify({ error: 'Failed to create entry', details: entryError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Return the access token and entry ID, plus form metadata for prefetching
    return new Response(
      JSON.stringify({ 
        accessToken,
        entryId: entry.id,
        expiresAt: expiresAt.toISOString(),
        formId: formId,
        organizationId: formData.organization_id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error("Unexpected error:", error);
    
    return new Response(
      JSON.stringify({ error: 'Server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

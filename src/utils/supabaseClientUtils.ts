
/**
 * Utilities for creating and configuring Supabase clients.
 * These functions handle the creation of authenticated and unauthenticated
 * Supabase clients with the appropriate configuration.
 *
 * Additions:
 *  - Lightweight access logging (READ) via public.log_access RPC using the centralized helper.
 *  - This improves GDPR auditability without altering existing data flows.
 */

import { createClient } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";
import { logAccess } from "./auditLogClient";

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://jawtwwwelxaaprzsqfyp.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imphd3R3d3dlbHhhYXByenNxZnlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1MDMzMTYsImV4cCI6MjA1ODA3OTMxNn0.FAAh0QpAM18T2pDrohTUBUMcNez8dnmIu3bpRoa8Yhk";

/**
 * Creates a Supabase client with optional dynamic token refresh capability
 * @param tokenProvider Optional function that returns a fresh JWT token
 * @returns A Supabase client with optional authentication
 */
export const createSupabaseClient = (tokenProvider?: () => Promise<string | null>) => {
  // If no token provider, return a basic unauthenticated client
  if (!tokenProvider) {
    console.log('[createSupabaseClient] No token provider, creating unauthenticated client');
    return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  // Create a custom fetch that injects fresh tokens for each request
  const customFetch = async (url: RequestInfo | URL, options: RequestInit = {}) => {
    const isSupabaseRequest = typeof url === 'string' && url.includes('supabase.co');
    
    if (isSupabaseRequest && tokenProvider) {
      try {
        const token = await tokenProvider();
        if (token) {
          const headers = new Headers(options.headers);
          headers.set('Authorization', `Bearer ${token}`);
          options = { ...options, headers };
        }
      } catch (error) {
        console.warn('[createSupabaseClient] Failed to get fresh token:', error);
      }
    }
    
    // Make the request with fresh token
    const response = await fetch(url, options);
    
    // If we get a JWT error, try once more with a fresh token
    if (response.status === 401 && isSupabaseRequest && tokenProvider) {
      try {
        const errorData = await response.clone().json();
        if (errorData?.code === 'PGRST301' || errorData?.message?.includes('JWT')) {
          console.log('[createSupabaseClient] JWT error detected, retrying with fresh token');
          
          const freshToken = await tokenProvider();
          if (freshToken) {
            const retryHeaders = new Headers(options.headers);
            retryHeaders.set('Authorization', `Bearer ${freshToken}`);
            return fetch(url, { ...options, headers: retryHeaders });
          }
        }
      } catch (retryError) {
        console.warn('[createSupabaseClient] Failed to retry with fresh token:', retryError);
      }
    }
    
    return response;
  };
  
  return createClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      global: {
        fetch: customFetch
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

/**
 * Helper function to handle Supabase errors consistently
 * @param error The error object from Supabase
 * @returns A standardized error object
 */
export const handleSupabaseError = (error: any): Error => {
  console.error("Supabase error:", error);
  
  // Extract the most useful error message
  let message = "Ett oväntat fel uppstod";
  
  if (typeof error === 'string') {
    message = error;
  } else if (error?.message) {
    message = error.message;
  } else if (error?.error_description) {
    message = error.error_description;
  }
  
  // Create a standardized error object
  const standardizedError = new Error(message);
  
  // Add the original error as a property
  (standardizedError as any).originalError = error;
  
  return standardizedError;
};

/**
 * Utilities for working with stores
 */
export const storesUtils = {
  /**
   * Find a store by name within an organization, or create it if it doesn't exist
   * @param supabase Supabase client
   * @param organizationId Organization ID
   * @param storeName Store name
   * @param storeData Additional store data (optional)
   * @returns The found or created store
   */
  async findOrCreateByName(
    supabase, 
    organizationId: string, 
    storeName: string,
    storeData?: Partial<Database['public']['Tables']['stores']['Insert']>
  ) {
    if (!storeName || !organizationId) {
      throw new Error("Store name and organization ID are required");
    }
    
    // Try to find the store first
    const { data: existingStore, error: findError } = await supabase
      .from('stores')
      .select('*')
      .eq('organization_id', organizationId)
      .ilike('name', storeName)
      .limit(1)
      .single();
      
    if (!findError && existingStore) {
      // Access log for direct match
      logAccess(supabase, { table: 'stores', recordId: existingStore.id, purpose: 'find_or_create:found' });
      return existingStore;
    }
    
    // Create the store if it doesn't exist
    const { data: newStore, error: createError } = await supabase
      .from('stores')
      .insert({
        organization_id: organizationId,
        name: storeName,
        ...storeData
      })
      .select()
      .single();
      
    if (createError) {
      throw handleSupabaseError(createError);
    }
    
    // Creation is a write; DB triggers will log the change. We still log an access context if needed:
    logAccess(supabase, { table: 'stores', recordId: newStore?.id ?? null, purpose: 'find_or_create:created' });
    return newStore;
  },
  
  /**
   * Get all stores for an organization
   * @param supabase Supabase client
   * @param organizationId Organization ID
   * @returns List of stores
   */
  async getByOrganization(supabase, organizationId: string) {
    if (!organizationId) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');
      
    if (error) {
      throw handleSupabaseError(error);
    }

    // Access log for listing (no single record id)
    logAccess(supabase, { table: 'stores', recordId: null, purpose: 'list_by_org' });
    
    return data || [];
  },
  
  /**
   * Get a store by ID
   * @param supabase Supabase client
   * @param storeId Store ID
   * @returns The store if found, null otherwise
   */
  async getById(supabase, storeId: string) {
    if (!storeId) {
      return null;
    }
    
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw handleSupabaseError(error);
    }

    // Access log with specific record id
    logAccess(supabase, { table: 'stores', recordId: storeId, purpose: 'detail_view' });
    
    return data;
  }
};

/**
 * Utilities for working with optician assignments
 */
export const opticianUtils = {
  /**
   * Assign an optician to an anamnesis entry
   * @param supabase Supabase client
   * @param entryId Entry ID
   * @param opticianId Optician ID
   * @returns Updated entry
   */
  async assignToEntry(supabase, entryId: string, opticianId: string | null) {
    if (!entryId) {
      throw new Error("Entry ID is required");
    }
    
    const { data, error } = await supabase
      .from('anamnes_entries')
      .update({ optician_id: opticianId })
      .eq('id', entryId)
      .select()
      .single();
      
    if (error) {
      throw handleSupabaseError(error);
    }
    
    // Writes are logged by DB triggers; optionally add context access log:
    logAccess(supabase, { table: 'anamnes_entries', recordId: entryId, purpose: 'assign_optician' });
    return data;
  },
  
  /**
   * Get entries assigned to a specific optician
   * @param supabase Supabase client
   * @param organizationId Organization ID
   * @param opticianId Optician ID
   * @returns List of entries assigned to the optician
   */
  async getAssignedEntries(supabase, organizationId: string, opticianId: string) {
    if (!organizationId || !opticianId) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('anamnes_entries')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('optician_id', opticianId);
      
    if (error) {
      throw handleSupabaseError(error);
    }

    // Access log for list view for the optician
    logAccess(supabase, { table: 'anamnes_entries', recordId: null, purpose: 'assigned_entries_list' });
    
    return data || [];
  },
  
  /**
   * Get all opticians in an organization
   * @param supabase Supabase client
   * @param organizationId Organization ID
   * @returns List of opticians
   */
  async getOrganizationOpticians(supabase, organizationId: string) {
    if (!organizationId) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('role', 'optician');
      
    if (error) {
      throw handleSupabaseError(error);
    }

    // Access log for listing org opticians
    logAccess(supabase, { table: 'users', recordId: null, purpose: 'org_opticians_list' });
    
    return data || [];
  }
};

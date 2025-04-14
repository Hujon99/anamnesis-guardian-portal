/**
 * This utility module provides database operations for edge functions.
 * It includes functions for creating Supabase clients and common database queries.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

/**
 * Creates a Supabase client using environment variables
 * @returns Supabase client or null if credentials are missing
 */
export function createSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY'); // Using anon key for public access
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials:', { 
      hasUrl: !!supabaseUrl, 
      hasKey: !!supabaseKey 
    });
    return null;
  }
  
  console.log('Creating Supabase client with URL:', supabaseUrl.substring(0, 15) + '...');
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false, // Disable session persistence for edge functions
      autoRefreshToken: false
    }
  });
}

/**
 * Fetches an entry by its access token
 * @param supabase Supabase client
 * @param token Access token
 * @returns Object containing the entry data or error information
 */
export async function fetchEntryByToken(supabase: SupabaseClient, token: string): Promise<{
  entry?: any;
  error?: any;
  notFound?: boolean;
}> {
  // Log token information (safely) for debugging
  const tokenLength = token.length;
  const tokenPrefix = token.substring(0, 6);
  const tokenSuffix = token.substring(tokenLength - 6);
  
  console.log(`Fetching entry with token: ${tokenPrefix}... (length: ${tokenLength})`);
  
  // Check if token contains any URL-unsafe characters
  const containsUrlUnsafeChars = /[^a-zA-Z0-9\-_]/g.test(token);
  if (containsUrlUnsafeChars) {
    console.warn('Token contains URL-unsafe characters that might need encoding');
  }
  
  // Perform the database query
  const { data: entry, error } = await supabase
    .from('anamnes_entries')
    .select('*')
    .eq('access_token', token)
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching entry with token:', error);
    return { error };
  }
  
  if (!entry) {
    console.error(`No entry found with token: ${tokenPrefix}... (length: ${tokenLength})`);
    console.log(`Token suffix for verification: ...${tokenSuffix}`);
    
    // Additional diagnostics - try fetching directly
    try {
      const { count } = await supabase
        .from('anamnes_entries')
        .select('*', { count: 'exact', head: true });
      
      console.log(`Total entries in database: ${count}`);
      
      // Fetch a sample entry to verify database connectivity
      const { data: sampleEntry } = await supabase
        .from('anamnes_entries')
        .select('access_token')
        .limit(1)
        .single();
      
      if (sampleEntry?.access_token) {
        const sampleTokenLength = sampleEntry.access_token.length;
        const samplePrefix = sampleEntry.access_token.substring(0, 3);
        console.log(`Sample entry token found with length ${sampleTokenLength}, prefix: ${samplePrefix}...`);
      } else {
        console.log('No sample entries found in database');
      }
    } catch (diagError) {
      console.error('Diagnostics error:', diagError);
    }
    
    return { notFound: true };
  }
  
  console.log(`Found entry with ID: ${entry.id}, status: ${entry.status}`);
  return { entry };
}

/**
 * Fetches a form template for an organization
 * @param supabase Supabase client
 * @param organizationId Organization ID
 * @returns Object containing the form data or error information
 */
export async function fetchFormTemplate(supabase: SupabaseClient, organizationId: string): Promise<{
  formTemplate?: any;
  error?: any;
  notFound?: boolean;
}> {
  console.log(`Fetching form template for organization: ${organizationId}`);
  
  const { data: formTemplate, error } = await supabase
    .from('anamnes_forms')
    .select("*")
    .or(`organization_id.eq.${organizationId},organization_id.is.null`)
    .order("organization_id", { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error) {
    console.error("Error fetching form template:", error);
    return { error };
  }
  
  if (!formTemplate) {
    console.error("No form template found for organization:", organizationId);
    return { notFound: true };
  }
  
  console.log('Form template found:', formTemplate.title);
  return { formTemplate };
}

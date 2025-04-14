
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
  return createClient(supabaseUrl, supabaseKey);
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
  console.log('Starting fetchEntryByToken with token:', token.substring(0, 6) + '...');
  
  try {
    console.log('Executing query to fetch entry...');
    const { data: entry, error } = await supabase
      .from('anamnes_entries')
      .select('*')
      .eq('access_token', token)
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      return { error };
    }

    if (!entry) {
      console.log('No entry found with token');
      return { notFound: true };
    }

    console.log('Entry found with ID:', entry.id);
    return { entry };
  } catch (error) {
    console.error('Unexpected error in fetchEntryByToken:', error);
    return { error };
  }
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
  console.log('Starting fetchFormTemplate for organization:', organizationId);
  
  try {
    console.log('Executing query to fetch form template...');
    const { data: formTemplate, error } = await supabase
      .from('anamnes_forms')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      return { error };
    }

    if (!formTemplate) {
      console.log('No form template found for organization');
      return { notFound: true };
    }

    console.log('Form template found with ID:', formTemplate.id);
    return { formTemplate };
  } catch (error) {
    console.error('Unexpected error in fetchFormTemplate:', error);
    return { error };
  }
}

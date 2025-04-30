/**
 * This utility module provides database operations for edge functions.
 * It includes functions for creating Supabase clients and common database queries.
 * Enhanced with improved error handling and SQL safety.
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
  if (!token) {
    console.error('Missing token in fetchEntryByToken');
    return { error: 'Missing token parameter' };
  }

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
    console.log('Entry has magic link data:', 
      entry.is_magic_link ? 'Yes' : 'No',
      'booking_id:', entry.booking_id || 'None',
      'store_id:', entry.store_id || 'None'
    );
    
    return { entry };
  } catch (error) {
    console.error('Unexpected error in fetchEntryByToken:', error);
    return { error };
  }
}

/**
 * Fetches a form template for an organization, falling back to default template if none exists
 * @param supabase Supabase client
 * @param organizationId Organization ID
 * @returns Object containing the form data or error information
 */
export async function fetchFormTemplate(supabase: SupabaseClient, organizationId: string): Promise<{
  formTemplate?: any;
  error?: any;
  notFound?: boolean;
}> {
  if (!organizationId) {
    console.error('Missing organizationId in fetchFormTemplate');
    return { error: 'Missing organization ID parameter' };
  }
  
  console.log('Starting fetchFormTemplate for organization:', organizationId);
  
  try {
    console.log('First trying to fetch organization-specific template...');
    
    // First try to get the organization-specific template
    let { data: orgTemplate, error: orgError } = await supabase
      .from('anamnes_forms')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();
      
    if (orgError) {
      console.error('Error fetching organization template:', orgError);
      // Continue to try default template instead of failing
    }
    
    // If we found an org template, return it
    if (orgTemplate) {
      console.log('Found organization-specific template with ID:', orgTemplate.id);
      return { formTemplate: orgTemplate };
    }
    
    // Otherwise, try to get the default template
    console.log('No org template found, fetching default template...');
    
    let { data: defaultTemplate, error: defaultError } = await supabase
      .from('anamnes_forms')
      .select('*')
      .is('organization_id', null)
      .maybeSingle();
      
    if (defaultError) {
      console.error('Error fetching default template:', defaultError);
      return { error: defaultError };
    }
    
    if (!defaultTemplate) {
      console.log('No default template found');
      return { notFound: true };
    }
    
    console.log('Found default template with ID:', defaultTemplate.id);
    return { formTemplate: defaultTemplate };
  } catch (error) {
    console.error('Unexpected error in fetchFormTemplate:', error);
    return { error };
  }
}

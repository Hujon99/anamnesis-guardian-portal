
/**
 * This utility module provides database operations for edge functions.
 * It includes functions for creating Supabase clients and common database queries.
 * Enhanced with improved error handling and SQL safety.
 *
 * Update: Introduced auto-redaction workflow for journaled/ready/reviewed entries.
 * - runAutoRedaction: clears medical content and flags entries as redacted instead of deleting them
 * - logRedactionResult: logs redaction outcomes to auto_redaction_logs
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

/**
 * Creates a Supabase client using environment variables
 * @returns Supabase client or null if credentials are missing
 */
export function createSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Using service role key for admin access
  
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
 * Runs the auto deletion process for expired anamnesis entries
 * @returns Object containing information about the deletion process
 */
export async function runAutoDeletion(supabase: SupabaseClient): Promise<{
  deletedEntries: number;
  organizationsAffected?: string[];
  error?: any;
}> {
  try {
    console.log('Starting auto deletion process...');
    
    // Find entries that are past their auto-deletion timestamp
    const { data: entriesToDelete, error: fetchError } = await supabase
      .from('anamnes_entries')
      .select('id, organization_id, auto_deletion_timestamp, status')
      .lt('auto_deletion_timestamp', new Date().toISOString())
      .not('auto_deletion_timestamp', 'is', null);

    if (fetchError) {
      console.error('Error fetching entries to delete:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${entriesToDelete?.length || 0} entries to delete`);

    if (!entriesToDelete || entriesToDelete.length === 0) {
      return { deletedEntries: 0 };
    }

    const organizationIds = [...new Set(entriesToDelete.map(entry => entry.organization_id))];
    console.log('Organizations affected:', organizationIds);
    
    // Delete the entries
    const { error: deleteError } = await supabase
      .from('anamnes_entries')
      .delete()
      .in('id', entriesToDelete.map(entry => entry.id));

    if (deleteError) {
      console.error('Error deleting entries:', deleteError);
      throw deleteError;
    }

    // Update last_auto_deletion_run for affected organizations
    await supabase
      .from('organization_settings')
      .upsert(
        organizationIds.map(id => ({
          organization_id: id,
          last_auto_deletion_run: new Date().toISOString()
        })),
        { onConflict: 'organization_id' }
      );

    return {
      deletedEntries: entriesToDelete.length,
      organizationsAffected: organizationIds
    };
  } catch (error) {
    console.error('Error in runAutoDeletion:', error);
    return {
      deletedEntries: 0,
      error
    };
  }
}

/**
 * Runs cleanup for stuck forms (status='sent' older than 2 hours)
 * @returns Object containing information about the cleanup process
 */
export async function runStuckFormsCleanup(supabase: SupabaseClient): Promise<{
  deletedEntries: number;
  organizationsAffected?: string[];
  error?: any;
}> {
  try {
    console.log('Starting stuck forms cleanup process...');
    
    // Calculate 2 hours ago timestamp
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    
    // Find stuck forms (status='sent' and older than 2 hours) in batches
    const { data: stuckForms, error: fetchError } = await supabase
      .from('anamnes_entries')
      .select('id, organization_id, status, created_at')
      .eq('status', 'sent')
      .lt('created_at', twoHoursAgo.toISOString())
      .limit(500); // Process in batches to avoid timeouts

    if (fetchError) {
      console.error('Error fetching stuck forms:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${stuckForms?.length || 0} stuck forms to delete`);

    if (!stuckForms || stuckForms.length === 0) {
      return { deletedEntries: 0 };
    }

    const organizationIds = [...new Set(stuckForms.map(entry => entry.organization_id))];
    console.log('Organizations affected by stuck form cleanup:', organizationIds);
    
    // Delete the stuck forms
    const { error: deleteError } = await supabase
      .from('anamnes_entries')
      .delete()
      .in('id', stuckForms.map(entry => entry.id));

    if (deleteError) {
      console.error('Error deleting stuck forms:', deleteError);
      throw deleteError;
    }

    // Update last_auto_deletion_run for affected organizations
    await supabase
      .from('organization_settings')
      .upsert(
        organizationIds.map(id => ({
          organization_id: id,
          last_auto_deletion_run: new Date().toISOString()
        })),
        { onConflict: 'organization_id' }
      );

    return {
      deletedEntries: stuckForms.length,
      organizationsAffected: organizationIds
    };
  } catch (error) {
    console.error('Error in runStuckFormsCleanup:', error);
    return {
      deletedEntries: 0,
      error
    };
  }
}

/**
 * Logs the result of an auto deletion process
 * @param supabase Supabase client
 * @param result Result of the auto deletion process
 */
export async function logDeletionResult(
  supabase: SupabaseClient, 
  result: { 
    deletedEntries: number; 
    organizationsAffected?: string[]; 
    error?: any 
  }
): Promise<void> {
  try {
    await supabase
      .from('auto_deletion_logs')
      .insert({
        entries_deleted: result.deletedEntries,
        organizations_affected: result.organizationsAffected || [],
        status: result.error ? 'error' : 'success',
        error: result.error ? (result.error.message || String(result.error)) : null,
        run_at: new Date().toISOString()
      });
    
    console.log('Successfully logged deletion result');
  } catch (logError) {
    console.error('Error logging deletion result:', logError);
  }
}

/**
 * Runs the auto redaction process for due journaled/reviewed entries.
 * Instead of deleting, clears medical content and flags as redacted.
 */
export async function runAutoRedaction(supabase: SupabaseClient): Promise<{
  redactedEntries: number;
  organizationsAffected?: string[];
  error?: any;
}> {
  try {
    console.log('Starting auto redaction process...');

    // Find entries that are due for redaction: auto_deletion_timestamp passed, not yet redacted, and in target statuses
    const { data: entriesToRedact, error: fetchError } = await supabase
      .from('anamnes_entries')
      .select('id, organization_id')
      .lt('auto_deletion_timestamp', new Date().toISOString())
      .not('auto_deletion_timestamp', 'is', null)
      .eq('is_redacted', false)
      .in('status', ['journaled', 'reviewed']);

    if (fetchError) {
      console.error('Error fetching entries to redact:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${entriesToRedact?.length || 0} entries to redact`);

    if (!entriesToRedact || entriesToRedact.length === 0) {
      return { redactedEntries: 0 };
    }

    const ids = entriesToRedact.map(e => e.id);
    const organizationIds = [...new Set(entriesToRedact.map(e => e.organization_id))];

    // Perform redaction: clear medical content and revoke access token, flag as redacted
    const { error: updateError } = await supabase
      .from('anamnes_entries')
      .update({
        is_redacted: true,
        redacted_at: new Date().toISOString(),
        answers: null,
        formatted_raw_data: null,
        ai_summary: null,
        internal_notes: null,
        access_token: null,
      })
      .in('id', ids);

    if (updateError) {
      console.error('Error redacting entries:', updateError);
      throw updateError;
    }

    // Update last_auto_deletion_run (reuse setting to track maintenance cadence)
    await supabase
      .from('organization_settings')
      .upsert(
        organizationIds.map(id => ({
          organization_id: id,
          last_auto_deletion_run: new Date().toISOString()
        })),
        { onConflict: 'organization_id' }
      );

    return {
      redactedEntries: ids.length,
      organizationsAffected: organizationIds,
    };
  } catch (error) {
    console.error('Error in runAutoRedaction:', error);
    return { redactedEntries: 0, error };
  }
}

/**
 * Logs the result of an auto redaction process
 */
export async function logRedactionResult(
  supabase: SupabaseClient,
  result: {
    redactedEntries: number;
    organizationsAffected?: string[];
    error?: any;
  }
): Promise<void> {
  try {
    await supabase
      .from('auto_redaction_logs')
      .insert({
        entries_redacted: result.redactedEntries,
        organizations_affected: result.organizationsAffected || [],
        error: result.error ? (result.error.message || String(result.error)) : null,
        run_at: new Date().toISOString(),
      });
    console.log('Successfully logged redaction result');
  } catch (logError) {
    console.error('Error logging redaction result:', logError);
  }
}

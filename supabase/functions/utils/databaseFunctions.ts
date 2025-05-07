/**
 * This file contains utility functions for working with the database in edge functions
 * It provides common operations needed across multiple edge functions
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

/**
 * Creates a submission logs table if it doesn't exist yet
 * @returns Boolean indicating success
 */
export async function createSubmissionLogsTable(): Promise<boolean> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Missing Supabase credentials');
      return false;
    }
    
    console.log('[databaseFunctions/createSubmissionLogsTable]: Creating submission logs table');
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Create the table using plain SQL as there's no RPC way to do this
    const { error } = await supabaseAdmin.rpc('create_submission_logs_table_function');
    
    if (error) {
      console.error('[databaseFunctions/createSubmissionLogsTable]: Error creating submission logs table:', error);
      return false;
    }
    
    console.log('[databaseFunctions/createSubmissionLogsTable]: Table created or already exists');
    return true;
  } catch (error) {
    console.error('[databaseFunctions/createSubmissionLogsTable]: Exception creating submission logs table:', error);
    return false;
  }
}

/**
 * Logs a form submission attempt to the submission_logs table
 * @param token The access token used (partially masked for security)
 * @param entryId The entry ID being updated
 * @param isOptician Whether the submission came from an optician
 * @param status Success or error status
 * @param errorDetails Error details if any
 * @param updateDataSample Sample of the update data being applied
 * @returns Boolean indicating success
 */
export async function logSubmissionAttempt(
  token: string | null,
  entryId: string | null,
  isOptician: boolean,
  status: string,
  errorDetails: string | null = null,
  updateDataSample: string | null = null
): Promise<boolean> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('[databaseFunctions/logSubmissionAttempt]: Missing Supabase credentials');
      return false;
    }
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Mask token for security (only keep first 6 chars)
    let maskedToken = null;
    if (token) {
      maskedToken = token.substring(0, 6) + '...';
    }
    
    console.log(`[databaseFunctions/logSubmissionAttempt]: Logging submission attempt for entry: ${entryId}, status: ${status}`);
    
    // Insert a log entry
    const { error } = await supabaseAdmin
      .from('submission_logs')
      .insert({
        token: maskedToken,
        entry_id: entryId,
        is_optician: isOptician,
        status,
        error_details: errorDetails,
        update_data_sample: updateDataSample
      });
    
    if (error) {
      console.error('[databaseFunctions/logSubmissionAttempt]: Error logging submission attempt:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[databaseFunctions/logSubmissionAttempt]: Exception logging submission attempt:', error);
    return false;
  }
}

/**
 * Gets the current set_access_token function parameters for debugging
 * @returns String representation of the current token or error message
 */
export async function checkAccessTokenValue(): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return 'Missing Supabase credentials';
    }
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Query the current setting value
    const { data, error } = await supabaseAdmin.rpc('current_setting', {
      setting_name: 'app.access_token',
      missing_ok: true
    });
    
    if (error) {
      return `Error checking token: ${error.message}`;
    }
    
    return data ? `Token is set: ${data.substring(0, 6)}...` : 'Token is not set';
  } catch (error) {
    return `Exception checking token: ${(error as Error).message}`;
  }
}

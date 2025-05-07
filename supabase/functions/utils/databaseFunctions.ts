
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
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Create the table using plain SQL as there's no RPC way to do this
    const { error } = await supabaseAdmin.rpc('create_submission_logs_table_function');
    
    if (error) {
      console.error('Error creating submission logs table:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception creating submission logs table:', error);
    return false;
  }
}

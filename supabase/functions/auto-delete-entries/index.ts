/**
 * This edge function handles the automatic deletion of anamnesis entries
 * that have been marked as reviewed/ready for more than 48 hours, and also
 * cleans up stuck forms in 'sent' status for more than 2 hours.
 * It runs on a schedule and logs deletions for audit purposes.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { Database } from '../utils/database.types.ts'
import { createSupabaseClient, runAutoDeletion, runStuckFormsCleanup, logDeletionResult } from '../utils/databaseUtils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log('Auto deletion process started at:', new Date().toISOString())
    
    // Initialize Supabase client
    const supabase = createSupabaseClient();
    if (!supabase) {
      throw new Error('Failed to create Supabase client - missing credentials');
    }

    // Run both auto deletion and stuck forms cleanup
    console.log('Running both auto deletion and stuck forms cleanup...');
    const [autoDeletionResult, stuckFormsResult] = await Promise.all([
      runAutoDeletion(supabase),
      runStuckFormsCleanup(supabase)
    ]);
    
    const totalDeleted = autoDeletionResult.deletedEntries + stuckFormsResult.deletedEntries;
    const allOrganizations = [
      ...(autoDeletionResult.organizationsAffected || []),
      ...(stuckFormsResult.organizationsAffected || [])
    ];
    const uniqueOrganizations = [...new Set(allOrganizations)];
    
    // Log both results separately for audit trail
    await Promise.all([
      logDeletionResult(supabase, {
        deletedEntries: autoDeletionResult.deletedEntries,
        organizationsAffected: autoDeletionResult.organizationsAffected,
        error: autoDeletionResult.error
      }),
      logDeletionResult(supabase, {
        deletedEntries: stuckFormsResult.deletedEntries,
        organizationsAffected: stuckFormsResult.organizationsAffected,
        error: stuckFormsResult.error
      })
    ]);

    if (totalDeleted === 0) {
      console.log('No entries to delete from either cleanup process');
      return new Response(JSON.stringify({ 
        message: 'No entries to delete',
        autoDeletion: autoDeletionResult.deletedEntries,
        stuckFormsCleanup: stuckFormsResult.deletedEntries,
        totalDeleted: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    console.log(`Successfully deleted ${totalDeleted} total entries (auto: ${autoDeletionResult.deletedEntries}, stuck: ${stuckFormsResult.deletedEntries})`);

    return new Response(JSON.stringify({ 
      message: 'Cleanup completed successfully',
      autoDeletion: autoDeletionResult.deletedEntries,
      stuckFormsCleanup: stuckFormsResult.deletedEntries,
      totalDeleted,
      organizationsAffected: uniqueOrganizations
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error in cleanup process:', error);
    
    // Log the error
    try {
      const supabase = createSupabaseClient();
      if (supabase) {
        await logDeletionResult(supabase, {
          deletedEntries: 0,
          error
        });
      }
    } catch (logErr) {
      console.error('Failed to log error:', logErr);
    }
    
    return new Response(JSON.stringify({ 
      error: error.message || String(error),
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
})
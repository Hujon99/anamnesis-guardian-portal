/**
 * This edge function handles the automatic deletion of anamnesis entries
 * that have been marked as reviewed/ready for more than 48 hours, and also
 * cleans up stuck forms in 'sent' status for more than 2 hours.
 * It runs on a schedule and logs deletions for audit purposes.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { Database } from '../utils/database.types.ts'
import { createSupabaseClient, runAutoRedaction, runStuckFormsCleanup, logDeletionResult, logRedactionResult } from '../utils/databaseUtils.ts'

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

    // Run auto redaction and stuck forms cleanup in parallel
    console.log('Running auto redaction and stuck forms cleanup...');
    const [autoRedactionResult, stuckFormsResult] = await Promise.all([
      runAutoRedaction(supabase),
      runStuckFormsCleanup(supabase)
    ]);
    
    const totalProcessed = autoRedactionResult.redactedEntries + stuckFormsResult.deletedEntries;
    const allOrganizations = [
      ...(autoRedactionResult.organizationsAffected || []),
      ...(stuckFormsResult.organizationsAffected || [])
    ];
    const uniqueOrganizations = [...new Set(allOrganizations)];
    
    // Log both results separately for audit trail
    await Promise.all([
      logRedactionResult(supabase, {
        redactedEntries: autoRedactionResult.redactedEntries,
        organizationsAffected: autoRedactionResult.organizationsAffected,
        error: autoRedactionResult.error
      }),
      logDeletionResult(supabase, {
        deletedEntries: stuckFormsResult.deletedEntries,
        organizationsAffected: stuckFormsResult.organizationsAffected,
        error: stuckFormsResult.error
      })
    ]);

    if (totalProcessed === 0) {
      console.log('No entries to process from either redaction or cleanup');
      return new Response(JSON.stringify({ 
        message: 'No entries to process',
        autoRedaction: autoRedactionResult.redactedEntries,
        stuckFormsCleanup: stuckFormsResult.deletedEntries,
        totalProcessed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    console.log(`Successfully processed ${totalProcessed} total entries (redacted: ${autoRedactionResult.redactedEntries}, stuck deleted: ${stuckFormsResult.deletedEntries})`);

    return new Response(JSON.stringify({ 
      message: 'Redaction and cleanup completed successfully',
      autoRedaction: autoRedactionResult.redactedEntries,
      stuckFormsCleanup: stuckFormsResult.deletedEntries,
      totalProcessed,
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
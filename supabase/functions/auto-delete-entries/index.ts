
/**
 * This edge function handles the automatic deletion of anamnesis entries
 * that have been marked as reviewed or ready for more than 48 hours.
 * It runs on a schedule and logs deletions for audit purposes.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { Database } from '../utils/database.types.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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
    
    // Validate that we have the required environment variables
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(`Missing required environment variables: 
        URL: ${SUPABASE_URL ? 'Set' : 'Missing'}, 
        SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing'}`);
    }
    
    const supabase = createClient<Database>(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    )

    // Find entries that are past their auto-deletion timestamp
    const { data: entriesToDelete, error: fetchError } = await supabase
      .from('anamnes_entries')
      .select('id, organization_id, auto_deletion_timestamp, status')
      .lt('auto_deletion_timestamp', new Date().toISOString())
      .not('auto_deletion_timestamp', 'is', null)

    if (fetchError) {
      console.error('Error fetching entries to delete:', fetchError)
      throw fetchError
    }

    console.log(`Found ${entriesToDelete?.length || 0} entries to delete`)

    // Delete entries and update organization settings
    if (entriesToDelete && entriesToDelete.length > 0) {
      const organizationIds = [...new Set(entriesToDelete.map(entry => entry.organization_id))]
      console.log('Organizations affected:', organizationIds)
      
      // Delete the entries
      const { error: deleteError } = await supabase
        .from('anamnes_entries')
        .delete()
        .in('id', entriesToDelete.map(entry => entry.id))

      if (deleteError) {
        console.error('Error deleting entries:', deleteError)
        throw deleteError
      }

      console.log(`Successfully deleted ${entriesToDelete.length} entries`)

      // Update last_auto_deletion_run for affected organizations
      const { error: updateError } = await supabase
        .from('organization_settings')
        .upsert(
          organizationIds.map(id => ({
            organization_id: id,
            last_auto_deletion_run: new Date().toISOString()
          })),
          { onConflict: 'organization_id' }
        )

      if (updateError) {
        console.error('Error updating organization settings:', updateError)
        throw updateError
      }

      console.log('Successfully updated organization settings')

      // Log to auto_deletion_logs table
      try {
        const { error: logError } = await supabase
          .from('auto_deletion_logs')
          .insert({
            entries_deleted: entriesToDelete.length,
            organizations_affected: organizationIds,
            status: 'success',
            run_at: new Date().toISOString()
          })
          
        if (logError) {
          console.warn('Could not write to auto_deletion_logs:', logError)
        } else {
          console.log('Successfully logged deletion to auto_deletion_logs table')
        }
      } catch (logErr) {
        console.warn('Logging to auto_deletion_logs failed, continuing anyway:', logErr)
      }

      return new Response(JSON.stringify({
        message: `Successfully deleted ${entriesToDelete.length} entries`,
        deletedEntries: entriesToDelete.length,
        organizationsAffected: organizationIds
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    console.log('No entries to delete')
    
    // Even when no entries are deleted, log the run
    try {
      const { error: logError } = await supabase
        .from('auto_deletion_logs')
        .insert({
          entries_deleted: 0,
          status: 'success',
          run_at: new Date().toISOString(),
          organizations_affected: []
        })
        
      if (logError) {
        console.warn('Could not write empty run to auto_deletion_logs:', logError)
      } else {
        console.log('Successfully logged empty run to auto_deletion_logs table')
      }
    } catch (logErr) {
      console.warn('Logging empty run to auto_deletion_logs failed:', logErr)
    }
    
    return new Response(JSON.stringify({
      message: 'No entries to delete',
      deletedEntries: 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Error in auto-delete function:', error)
    
    // Log error to auto_deletion_logs table
    try {
      const supabase = createClient<Database>(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY
      )
      
      await supabase
        .from('auto_deletion_logs')
        .insert({
          entries_deleted: 0,
          status: 'error',
          error: error.message || String(error),
          run_at: new Date().toISOString()
        })
        
      console.log('Successfully logged error to auto_deletion_logs table')
    } catch (logErr) {
      console.error('Failed to log error to auto_deletion_logs:', logErr)
    }
    
    return new Response(JSON.stringify({ 
      error: error.message || String(error),
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

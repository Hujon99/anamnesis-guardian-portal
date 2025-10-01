/**
 * Edge function for syncing Clerk organization members to Supabase users table.
 * This function runs with service role privileges to bypass RLS restrictions.
 * It ensures that all organization members from Clerk are properly synchronized
 * to the Supabase database, creating or updating user records as needed.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  organizationId: string;
  members: Array<{
    clerkUserId: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    role: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { organizationId, members }: SyncRequest = await req.json();

    if (!organizationId || !members) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[],
    };

    // Process each member
    for (const member of members) {
      try {
        // Check if user exists
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('clerk_user_id', member.clerkUserId)
          .eq('organization_id', organizationId)
          .maybeSingle();

        if (!existingUser) {
          // Create new user
          const { error: insertError } = await supabaseAdmin
            .from('users')
            .insert({
              clerk_user_id: member.clerkUserId,
              organization_id: organizationId,
              email: member.email,
              first_name: member.firstName,
              last_name: member.lastName,
              display_name: member.displayName,
              role: member.role,
            });

          if (insertError) {
            results.errors.push(`Failed to create user ${member.clerkUserId}: ${insertError.message}`);
          } else {
            results.created++;
          }
        } else {
          // Check if update is needed
          const needsUpdate = 
            existingUser.email !== member.email ||
            existingUser.first_name !== member.firstName ||
            existingUser.last_name !== member.lastName ||
            existingUser.display_name !== member.displayName ||
            existingUser.role !== member.role;

          if (needsUpdate) {
            const { error: updateError } = await supabaseAdmin
              .from('users')
              .update({
                email: member.email,
                first_name: member.firstName,
                last_name: member.lastName,
                display_name: member.displayName,
                role: member.role,
              })
              .eq('clerk_user_id', member.clerkUserId)
              .eq('organization_id', organizationId);

            if (updateError) {
              results.errors.push(`Failed to update user ${member.clerkUserId}: ${updateError.message}`);
            } else {
              results.updated++;
            }
          }
        }
      } catch (error) {
        results.errors.push(`Error processing user ${member.clerkUserId}: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Synced ${results.created + results.updated} users (${results.created} created, ${results.updated} updated)`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-users function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

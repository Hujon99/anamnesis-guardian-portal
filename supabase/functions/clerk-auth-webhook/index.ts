/**
 * Clerk Authentication Webhook Handler
 * 
 * This edge function processes authentication events from Clerk webhooks
 * and logs them to audit_auth_logs for GDPR compliance. It handles login,
 * logout, and session management events with IP anonymization for privacy.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.40.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
};

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
    primary_email_address_id?: string;
    created_at?: number;
    updated_at?: number;
    last_sign_in_at?: number;
    public_metadata?: Record<string, any>;
    unsafe_metadata?: Record<string, any>;
    private_metadata?: Record<string, any>;
  };
  object?: string;
}

// Initialize Supabase client with service role for database operations
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Anonymize IP address by keeping only first 3 octets
function anonymizeIP(ip: string): string {
  if (!ip) return 'unknown';
  
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }
  
  // For IPv6 or other formats, truncate to first 32 characters
  return ip.substring(0, 32) + '...';
}

// Map Clerk event types to our audit event types
function mapClerkEventToAuditType(clerkEventType: string): string {
  switch (clerkEventType) {
    case 'user.created':
    case 'session.created':
      return 'login';
    case 'session.ended':
    case 'session.removed':
      return 'logout';
    default:
      return 'session_created';
  }
}

// Get user's organization ID from their metadata or lookup
async function getUserOrganization(userId: string): Promise<string | null> {
  try {
    // First try to get from users table
    const { data: userData, error } = await supabase
      .from('users')
      .select('organization_id')
      .eq('clerk_user_id', userId)
      .single();
    
    if (!error && userData) {
      return userData.organization_id;
    }
    
    // Fallback to a default if not found
    console.log(`Warning: Could not find organization for user ${userId}`);
    return null;
  } catch (error) {
    console.error('Error getting user organization:', error);
    return null;
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const webhookEvent: ClerkWebhookEvent = await req.json();
    console.log('Received Clerk webhook:', webhookEvent.type);

    // Only process authentication-related events
    const relevantEvents = [
      'user.created',
      'session.created', 
      'session.ended',
      'session.removed'
    ];

    if (!relevantEvents.includes(webhookEvent.type)) {
      console.log(`Ignoring non-auth event: ${webhookEvent.type}`);
      return new Response(JSON.stringify({ status: 'ignored' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const { data } = webhookEvent;
    
    // Get user's organization
    const organizationId = await getUserOrganization(data.id);
    if (!organizationId) {
      console.log(`Skipping audit log for user ${data.id} - no organization found`);
      return new Response(JSON.stringify({ status: 'skipped_no_org' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Get primary email
    const primaryEmail = data.email_addresses?.find(
      (email, index) => index === 0 || email.email_address
    )?.email_address;

    // Get client information
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const clientIP = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // Create audit log entry
    const auditLogData = {
      event_type: mapClerkEventToAuditType(webhookEvent.type),
      user_id: data.id,
      organization_id: organizationId,
      clerk_user_id: data.id,
      email: primaryEmail,
      ip_address_anonymized: anonymizeIP(clientIP),
      user_agent: userAgent.substring(0, 500), // Limit length
      session_id: null, // Clerk doesn't provide session ID in webhooks
      metadata: {
        webhook_type: webhookEvent.type,
        timestamp: new Date().toISOString(),
        created_at: data.created_at,
        last_sign_in_at: data.last_sign_in_at
      }
    };

    const { error: insertError } = await supabase
      .from('audit_auth_logs')
      .insert(auditLogData);

    if (insertError) {
      console.error('Error inserting audit log:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create audit log' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    console.log(`Successfully logged auth event: ${webhookEvent.type} for user ${data.id}`);

    return new Response(
      JSON.stringify({ 
        status: 'success',
        event_type: webhookEvent.type,
        user_id: data.id
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error) {
    console.error('Error processing Clerk webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);

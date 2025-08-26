/**
 * Clerk Authentication Webhook Handler
 * 
 * This edge function processes authentication events from Clerk webhooks
 * and logs them to audit_auth_logs for GDPR compliance. It handles login,
 * logout, and session management events with IP anonymization for privacy.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.40.0';
import { Webhook } from 'https://esm.sh/svix@1.19.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
};

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string; // For user: user id, for session: session id
    user_id?: string; // Present on session events
    email_addresses?: Array<{ id?: string; email_address: string }>;
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
    const bodyText = await req.text();
    const svixId = req.headers.get('svix-id') || '';
    const svixTimestamp = req.headers.get('svix-timestamp') || '';
    const svixSignature = req.headers.get('svix-signature') || '';
    const webhookSecret = Deno.env.get('CLERK_WEBHOOK_SECRET');

    if (webhookSecret) {
      try {
        const wh = new Webhook(webhookSecret);
        wh.verify(bodyText, {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        });
      } catch (err) {
        console.error('Clerk webhook signature verification failed:', err);
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    } else {
      console.warn('CLERK_WEBHOOK_SECRET not set - skipping signature verification');
    }

    const webhookEvent: ClerkWebhookEvent = JSON.parse(bodyText);
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
    
    const isSessionEvent = webhookEvent.type.startsWith('session.');
    const clerkUserId = isSessionEvent ? (data as any).user_id ?? (data as any).actor_user_id : (data as any).id;
    const sessionId = isSessionEvent ? (data as any).id ?? null : null;

    // Get user's organization (may be null)
    const organizationId = await getUserOrganization(clerkUserId);

    // Resolve primary email from payload; fallback to DB lookup
    let primaryEmail: string | null = null;
    if (Array.isArray((data as any).email_addresses) && (data as any).email_addresses.length > 0) {
      const addresses = (data as any).email_addresses as Array<{ id?: string; email_address: string }>;
      if ((data as any).primary_email_address_id) {
        primaryEmail =
          addresses.find((e) => e.id && e.id === (data as any).primary_email_address_id)?.email_address ??
          addresses[0]?.email_address ??
          null;
      } else {
        primaryEmail = addresses[0]?.email_address ?? null;
      }
    }

    if (!primaryEmail) {
      const { data: userRow, error: userFetchError } = await supabase
        .from('users')
        .select('email')
        .eq('clerk_user_id', clerkUserId)
        .maybeSingle();

      if (!userFetchError && userRow) {
        primaryEmail = (userRow as any).email ?? null;
      }
    }

    // Get client information
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const clientIP =
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      'unknown';

    // Create audit log entry
    const auditLogData = {
      event_type: mapClerkEventToAuditType(webhookEvent.type),
      user_id: clerkUserId,
      organization_id: organizationId,
      clerk_user_id: clerkUserId,
      email: primaryEmail,
      ip_address_anonymized: anonymizeIP(clientIP),
      user_agent: userAgent.substring(0, 500), // Limit length
      session_id: sessionId,
      metadata: {
        webhook_type: webhookEvent.type,
        timestamp: new Date().toISOString(),
        created_at: (data as any).created_at,
        last_sign_in_at: (data as any).last_sign_in_at,
        raw: { id: (data as any).id, user_id: (data as any).user_id ?? null }
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

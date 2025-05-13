
/**
 * This file provides the Supabase client for the application.
 * It exports the client for use throughout the application and defines the base URL and keys.
 * This centralized client ensures consistent access to the Supabase backend.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Supabase configuration - Environmental variables are preferred, but using values directly when not available
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://jawtwwwelxaaprzsqfyp.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imphd3R3d3dlbHhhYXByenNxZnlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1MDMzMTYsImV4cCI6MjA1ODA3OTMxNn0.FAAh0QpAM18T2pDrohTUBUMcNez8dnmIu3bpRoa8Yhk";

// Create the supabase client with optimized configuration for better performance and reliability
export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      autoRefreshToken: false,  // We handle token refresh ourselves
      persistSession: true      // We still want to save session locally
    },
    global: {
      headers: {
        'x-client-info': `lovable_app/1.1` // Add client info for better debugging
      },
    },
    db: {
      schema: 'public'
    },
    realtime: {
      params: {
        eventsPerSecond: 10    // Limit events to prevent flooding
      }
    }
  }
);

// Export debug functions to help with development
export const debugSupabaseAuth = async () => {
  try {
    const session = await supabase.auth.getSession();
    console.log("Current Supabase session state:", {
      hasSession: !!session.data.session,
      expiresAt: session.data.session?.expires_at,
      user: session.data.session?.user?.id || "No user"
    });
    return session;
  } catch (err) {
    console.error("Error checking Supabase session:", err);
    return null;
  }
};
